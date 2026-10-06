from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import io
import json
import os
import uuid
import bcrypt
import jwt
import datetime

# --- IMPORTACIONES DE TUS NUEVOS ARCHIVOS ---
import models
from database import engine, get_db

# Crea las tablas en la base de datos local si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constantes para la encriptación de Tokens JWT
SECRET_KEY = "tu_clave_secreta_super_segura_tfg"
ALGORITHM = "HS256"

datos_partido = None

# --- DIRECTORIOS ---
CAMPOS_FILE = "data/campos.json"
MATCHES_DIR = "data/matches"
os.makedirs(MATCHES_DIR, exist_ok=True)


# ==========================================
#        NUEVOS ENDPOINTS (USUARIOS Y LOGIN)
# ==========================================

@app.post("/register")
def register_user(
    email: str = Form(...), 
    password: str = Form(...), 
    name: str = Form(...), 
    role: str = Form("jugador"), 
    db: Session = Depends(get_db)
):
    # Comprobar si el correo ya existe
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Hashear contraseña y guardar en la Base de Datos
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = models.User(email=email, hashed_password=hashed_pw, name=name, role=role)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Usuario creado con éxito", "user_id": new_user.id}

@app.post("/login")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Verificar si el usuario existe y si la contraseña coincide
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Email o contraseña incorrectos")
    
    # Generar Token JWT válido por 24 horas
    payload = {
        "sub": user.email,
        "id": user.id,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    }


# ==========================================
#        ENDPOINTS ANTIGUOS (SIMULADOR Y EXCEL)
# ==========================================

def cargar_campos():
    if os.path.exists(CAMPOS_FILE):
        with open(CAMPOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.get("/fields")
def get_fields():
    return cargar_campos()

@app.get("/matches/club/{club_id}")
def get_saved_matches(club_id: int, db: Session = Depends(get_db)):
    matches = db.query(models.Match).filter(models.Match.club_id == club_id).order_by(models.Match.date.desc()).all()
    # Devolvemos el mismo formato que esperaba tu React
    return [{"id": m.id, "name": m.name, "date": m.date, "field": m.field, "filename": m.filename} for m in matches]

@app.get("/matches/{match_id}")
def load_match(match_id: str):
    global datos_partido
    path = os.path.join(MATCHES_DIR, f"{match_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    with open(path, "r", encoding="utf-8") as f:
        datos_partido = json.load(f)
    return datos_partido

@app.delete("/matches/{match_id}")
def delete_match(match_id: str, db: Session = Depends(get_db)):
    # 1. Borrar de la base de datos
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match:
        db.delete(db_match)
        db.commit()
    
    # 2. Borrar archivo físico
    path = os.path.join(MATCHES_DIR, f"{match_id}.json")
    if os.path.exists(path):
        os.remove(path)
        
    return {"status": "success", "message": "Partido eliminado"}

@app.get("/matches/{match_id}/resumen")
def get_match_summary(match_id: str, db: Session = Depends(get_db)):
    # Buscamos el resumen directamente en la base de datos, sin abrir el JSON gigante
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return {
        "metadata": {
            "id": db_match.id,
            "name": db_match.name,
            "date": db_match.date,
            "field": db_match.field,
            "filename": db_match.filename
        },
        "resumen": db_match.resumen
    }

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    match_name: str = Form("Partido sin nombre"),
    field_id: str = Form(""), 
    start_h1: str = Form(""),
    end_h1: str = Form(""),
    start_h2: str = Form(""),
    end_h2: str = Form(""),
    u_sprint: float = Form(24.0),
    u_hsr: float = Form(21.0),
    u_acel: float = Form(3.0),
    club_id: int = Form(...),
    db: Session = Depends(get_db)
):
    global datos_partido
    try:
        ms_sprint = u_sprint / 3.6
        ms_hsr = u_hsr / 3.6
        campos = cargar_campos()
        campo_select = next((c for c in campos if c["id"] == field_id), None)
        if not campo_select and len(campos) > 0: campo_select = campos[0]

        field_limits = {
            "maxLat": campo_select["lat_tl"], "minLat": campo_select["lat_br"],
            "minLon": campo_select["lon_tl"], "maxLon": campo_select["lon_br"]
        } if campo_select else None

        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        columnas_req = {'local_time', 'DEV', 'lat', 'lon', 'vel'}
        if not columnas_req.issubset(set(df.columns)):
            raise ValueError(f"Faltan columnas. Se requieren: {columnas_req}")

        df['vel'] = df['vel'] / 3.6
        df['timestamp'] = pd.to_datetime(df['local_time']).dt.floor('100ms')
        fecha_str = str(df['timestamp'].dt.date.iloc[0])

        if start_h1 and end_h1 and start_h2 and end_h2:
            t_start_h1 = pd.to_datetime(f"{fecha_str} {start_h1}")
            t_end_h1 = pd.to_datetime(f"{fecha_str} {end_h1}")
            t_start_h2 = pd.to_datetime(f"{fecha_str} {start_h2}")
            t_end_h2 = pd.to_datetime(f"{fecha_str} {end_h2}")
            rango_h1 = pd.date_range(start=t_start_h1, end=t_end_h1, freq='100ms')
            rango_h2 = pd.date_range(start=t_start_h2, end=t_end_h2, freq='100ms')
            rango_global = rango_h1.union(rango_h2)
            mask = (df['timestamp'] >= t_start_h1) & (df['timestamp'] <= t_end_h1) | \
                   (df['timestamp'] >= t_start_h2) & (df['timestamp'] <= t_end_h2)
            df = df[mask]
        else:
            rango_global = pd.date_range(start=df['timestamp'].min(), end=df['timestamp'].max(), freq='100ms')
            rango_h1, rango_h2 = rango_global, pd.DatetimeIndex([])

        players_dict = {}
        resumen_stats = {} 
        dorsales = df['DEV'].unique()

        for dev in dorsales:
            dev_str = str(dev) 

            df_jugador = df[df['DEV'] == dev].drop_duplicates(subset=['timestamp']).set_index('timestamp')
            df_sincronizado = df_jugador.reindex(rango_global)
            
            df_sincronizado['vel_suavizada'] = df_sincronizado['vel'].rolling(window=3, min_periods=1).mean()
            df_sincronizado['acc'] = df_sincronizado['vel_suavizada'].diff(periods=5) / 0.5
            df_sincronizado['acc'] = df_sincronizado['acc'].rolling(window=5, min_periods=1).mean()
            
            df_sincronizado['jerk_abs'] = df_sincronizado['acc'].diff().abs()
            df_sincronizado['pl_frame'] = df_sincronizado['jerk_abs'] * 0.02 
            
            def get_period_stats(pdf):
                if pdf.empty or pdf['vel'].isna().all():
                    return {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0, "decels": 0, "hsr": 0, "pl": 0, "mins": 0}
                
                # 💡 CALCULAMOS LOS MINUTOS REALES CONTANDO LOS FOTOGRAMAS ACTIVOS
                minutos = int((pdf['vel'].notna().sum() * 0.1) / 60)
                
                distancia = (pdf['vel'].fillna(0) * 0.1).sum()
                hsr_dist = (pdf.loc[pdf['vel'] > ms_hsr, 'vel'].fillna(0) * 0.1).sum()
                v_max = pdf['vel'].max()
                
                sprints = ((pdf['vel'] > ms_sprint) & (pdf['vel'].shift(1) <= ms_sprint)).sum()
                acels = ((pdf['acc'] > u_acel) & (pdf['acc'].shift(1) <= u_acel)).sum()
                decels = ((pdf['acc'] < -u_acel) & (pdf['acc'].shift(1) >= -u_acel)).sum()
                player_load = pdf['pl_frame'].sum()

                return {
                    "dist": int(distancia), "max_v": round(float(v_max), 2), 
                    "sprints": int(sprints), "acels": int(acels), "decels": int(decels), 
                    "hsr": int(hsr_dist), "pl": int(player_load), "mins": minutos
                }

            h1_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h1)]
            h2_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h2)]

            resumen_stats[dev_str] = {
                "h1": get_period_stats(h1_data),
                "h2": get_period_stats(h2_data),
                "total": get_period_stats(df_sincronizado) 
            }

            lista_jugador = []
            for _, row in df_sincronizado.iterrows():
                if pd.isna(row['lat']):
                    lista_jugador.append(None)
                else:
                    v, a, pl = row['vel'], row['acc'] if not pd.isna(row['acc']) else 0, row['pl_frame'] if not pd.isna(row['pl_frame']) else 0
                    zona = "Trote"
                    if v > ms_sprint: zona = "Sprint"
                    elif v > ms_hsr: zona = "HSR"
                    elif v > 3.0: zona = "HMLD"
                    fuerza = "Normal"
                    if a > u_acel: fuerza = "Acel"
                    elif a < -u_acel: fuerza = "Decel"

                    lista_jugador.append({
                        "lat": row['lat'], "lon": row['lon'], "vel": v, "acc": a,
                        "zona": zona, "fuerza": fuerza, "pl": pl
                    })
            
            players_dict[dev_str] = lista_jugador

        match_id = str(uuid.uuid4())
        campo_nombre = campo_select["nombre"] if campo_select else "Campo"
        
        nuevo_partido_db = models.Match(
            id=match_id,
            name=match_name,
            date=fecha_str,
            field=campo_nombre,
            filename=file.filename,
            resumen=resumen_stats,
            club_id=club_id
        )
        db.add(nuevo_partido_db)
        db.commit()

        datos_partido = {
            "metadata": {"id": match_id, "name": match_name, "filename": file.filename, "date": fecha_str, "field": campo_nombre},
            "players": players_dict,
            "resumen": resumen_stats, 
            "field_limits": field_limits,
            "config": {
                "u_sprint": ms_sprint, "u_hsr": ms_hsr, "u_acel": u_acel, 
                "h1_frames": len(rango_h1), "h2_frames": len(rango_h2)
            }
        }
        
        with open(os.path.join(MATCHES_DIR, f"{match_id}.json"), "w", encoding="utf-8") as f:
            json.dump(datos_partido, f)

        return {"status": "success", "match_id": match_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/jugador/{player_id}/stats")
def get_player_stats(player_id: int, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    matches = db.query(models.Match).filter(models.Match.club_id == player.club_id).all()
    
    kpis = {
        "minutos": 0, "distancia": 0, "vmax": 0, "distRelativa": 0, 
        "playerLoad": 0, "sprints": 0, "hsr": 0, "acels": 0, "decels": 0
    }
    
    partidos_jugados = 0
    
    for m in matches:
        res = m.resumen
        if res and str(player.dorsal) in res:
            partidos_jugados += 1
            p_stats = res[str(player.dorsal)]["total"]
            
            kpis["distancia"] += p_stats.get("dist", 0)
            kpis["sprints"] += p_stats.get("sprints", 0)
            kpis["acels"] += p_stats.get("acels", 0)
            kpis["decels"] += p_stats.get("decels", 0)
            kpis["hsr"] += p_stats.get("hsr", 0)
            kpis["playerLoad"] += p_stats.get("pl", 0)
            # 💡 AQUÍ LEEMOS LOS MINUTOS REALES EN LUGAR DE ASUMIR 90
            kpis["minutos"] += p_stats.get("mins", 0) 
            
            if p_stats.get("max_v", 0) > kpis["vmax"]:
                kpis["vmax"] = p_stats.get("max_v", 0)

    if kpis["minutos"] > 0:
        kpis["distRelativa"] = round(kpis["distancia"] / kpis["minutos"], 1)

    player_load_acumulado = []
    if kpis["playerLoad"] > 0 and kpis["minutos"] > 0:
        media_load_por_partido = kpis["playerLoad"] / partidos_jugados
        media_minutos = int(kpis["minutos"] / partidos_jugados)
        if media_minutos == 0: media_minutos = 1
        
        # 💡 Adaptamos la curva gráfica al tiempo real jugado
        for i in range(20): 
            minuto = int((media_minutos / 19) * i)
            load_en_minuto = int((media_load_por_partido / media_minutos) * minuto)
            player_load_acumulado.append({"minuto": minuto, "load": load_en_minuto})
    else:
        player_load_acumulado = [{"minuto": 0, "load": 0}, {"minuto": 90, "load": 0}]

    dist_trote = kpis["distancia"] - kpis["hsr"] - kpis["sprints"]*10 
    zonas_velocidad = [
        {"name": 'Trote', "value": round((dist_trote / (kpis["distancia"]+1)) * 100, 1), "color": '#f1c40f'},
        {"name": 'HSR', "value": round((kpis["hsr"] / (kpis["distancia"]+1)) * 100, 1), "color": '#e67e22'}
    ]

    return {
        "player": {
            "id": player.id, "name": player.name, "dorsal": player.dorsal,
            "position": player.position, "photo_url": player.photo_url
        },
        "kpis": kpis,
        "playerLoadAcumulado": player_load_acumulado,
        "zonasVelocidad": zonas_velocidad
    }
# ==========================================
#        NUEVOS ENDPOINTS (PLANTILLA)
# ==========================================

@app.get("/club/{club_id}/players")
def get_players(club_id: int, db: Session = Depends(get_db)):
    players = db.query(models.Player).filter(models.Player.club_id == club_id).order_by(models.Player.dorsal).all()
    return players

@app.post("/club/{club_id}/players")
def add_player(
    club_id: int, 
    dorsal: str = Form(...),
    name: str = Form(...),
    position: str = Form("Desconocida"),
    photo_url: str = Form(None),
    db: Session = Depends(get_db)
):
    new_player = models.Player(
        dorsal=dorsal, 
        name=name, 
        position=position, 
        photo_url=photo_url, 
        club_id=club_id
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return {"status": "success", "player_id": new_player.id}

@app.get("/frames")
def get_frames():
    if datos_partido is None:
        raise HTTPException(status_code=404, detail="No hay archivo en memoria")
    return datos_partido