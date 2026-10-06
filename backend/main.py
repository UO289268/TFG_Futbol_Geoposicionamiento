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

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "tu_clave_secreta_super_segura_tfg"
ALGORITHM = "HS256"

datos_partido = None

CAMPOS_FILE = "data/campos.json"
MATCHES_DIR = "data/matches"
os.makedirs(MATCHES_DIR, exist_ok=True)

# ==========================================
#        USUARIOS Y LOGIN
# ==========================================
@app.post("/register")
def register_user(
    email: str = Form(...), 
    password: str = Form(...), 
    name: str = Form(...), 
    role: str = Form("jugador"), 
    db: Session = Depends(get_db)
):
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = models.User(email=email, hashed_password=hashed_pw, name=name, role=role)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Usuario creado con éxito", "user_id": new_user.id}

@app.post("/login")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Email o contraseña incorrectos")
    
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
#        CLUBES
# ==========================================
@app.get("/clubs")
def get_clubs(db: Session = Depends(get_db)):
    clubs = db.query(models.Club).all()
    
    # 💡 Autogenerar los clubes por defecto si la tabla está vacía
    if not clubs:
        c1 = models.Club(name="Real Madrid", location="Madrid, España", escudo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxZY_OjcRIUSudjl0C7cTUoEFbFGhbYRTnWic4By4Yrg&s=10", color="#00529F")
        c2 = models.Club(name="Real Sporting de Gijón", location="Gijón, España", escudo="https://assets.footylogos.com/previews/sporting-gijon/sporting-gijon-logo-footylogos-1200.webp", color="#ED1C24")
        db.add_all([c1, c2])
        db.commit()
        clubs = db.query(models.Club).all()

    res = []
    for c in clubs:
        equipos_count = db.query(models.Team).filter(models.Team.club_id == c.id).count()
        res.append({
            "id": c.id,
            "nombre": c.name,
            "ubicacion": c.location,
            "escudo": c.escudo,
            "color": c.color,
            "equipos": equipos_count
        })
    return res

@app.post("/clubs")
def create_club(
    name: str = Form(...),
    location: str = Form("Desconocida"),
    escudo: str = Form(""),
    color: str = Form("#2c3e50"),
    db: Session = Depends(get_db)
):
    new_club = models.Club(name=name, location=location, escudo=escudo, color=color)
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return {"status": "success", "club_id": new_club.id}

# ==========================================
#        EQUIPOS
# ==========================================
@app.get("/club/{club_id}/teams")
def get_teams(club_id: int, db: Session = Depends(get_db)):
    return db.query(models.Team).filter(models.Team.club_id == club_id).all()

@app.post("/club/{club_id}/teams")
def create_team(club_id: int, name: str = Form(...), category: str = Form(...), db: Session = Depends(get_db)):
    new_team = models.Team(name=name, category=category, club_id=club_id)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return {"status": "success", "team_id": new_team.id, "name": new_team.name}

@app.delete("/clubs/{club_id}")
def delete_club(club_id: int, db: Session = Depends(get_db)):
    db_club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if db_club:
        db.delete(db_club)
        db.commit()
    return {"status": "success"}

# ==========================================
#        PLANTILLA
# ==========================================
@app.get("/team/{team_id}/players")
def get_players(team_id: int, db: Session = Depends(get_db)):
    players = db.query(models.Player).filter(models.Player.team_id == team_id).order_by(models.Player.dorsal).all()
    return players

@app.post("/team/{team_id}/players")
def add_player(
    team_id: int, 
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
        team_id=team_id
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return {"status": "success", "player_id": new_player.id}

# ==========================================
#        SIMULADOR Y PARTIDOS
# ==========================================
def cargar_campos():
    if os.path.exists(CAMPOS_FILE):
        with open(CAMPOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.get("/fields")
def get_fields():
    return cargar_campos()

@app.get("/matches/team/{team_id}")
def get_saved_matches(team_id: int, db: Session = Depends(get_db)):
    matches = db.query(models.Match).filter(models.Match.team_id == team_id).order_by(models.Match.date.desc()).all()
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

@app.get("/matches/{match_id}/resumen")
def get_match_summary(match_id: str, db: Session = Depends(get_db)):
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

@app.delete("/matches/{match_id}")
def delete_match(match_id: str, db: Session = Depends(get_db)):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match:
        db.delete(db_match)
        db.commit()
    
    path = os.path.join(MATCHES_DIR, f"{match_id}.json")
    if os.path.exists(path):
        os.remove(path)
        
    return {"status": "success", "message": "Partido eliminado"}

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
    team_id: int = Form(...),
    alineacion: str = Form("{}"), 
    db: Session = Depends(get_db)
):
    global datos_partido
    try:
        alineacion_dict = json.loads(alineacion)
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
                
                segundos_activos = len(pdf['vel'].dropna().index.floor('s').unique())
                minutos = int(segundos_activos / 60)
                if minutos == 0 and segundos_activos > 0:
                    minutos = 1
                
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
            team_id=team_id
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
            },
            "alineacion": alineacion_dict 
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
    
    matches = db.query(models.Match).filter(models.Match.team_id == player.team_id).order_by(models.Match.date.desc()).all()
    
    kpis_totales = {
        "minutos": 0, "distancia": 0, "vmax": 0, "distRelativa": 0, 
        "playerLoad": 0, "sprints": 0, "hsr": 0, "acels": 0, "decels": 0
    }
    
    partidos_jugados = 0
    historial_partidos = [] # 💡 NUEVO: Guardaremos el desglose por partido
    
    for m in matches:
        res = m.resumen
        if res and str(player.dorsal) in res:
            partidos_jugados += 1
            p_stats = res[str(player.dorsal)]["total"]
            
            mins = p_stats.get("mins", 0)
            dist = p_stats.get("dist", 0)
            
            # 💡 Guardamos los datos de este partido concreto
            historial_partidos.append({
                "id": m.id,
                "name": m.name,
                "date": m.date,
                "minutos": mins,
                "distancia": dist,
                "vmax": p_stats.get("max_v", 0),
                "distRelativa": round(dist / mins, 1) if mins > 0 else 0,
                "playerLoad": p_stats.get("pl", 0),
                "sprints": p_stats.get("sprints", 0),
                "hsr": p_stats.get("hsr", 0),
                "acels": p_stats.get("acels", 0),
                "decels": p_stats.get("decels", 0)
            })
            
            # Sumamos al total general
            kpis_totales["distancia"] += dist
            kpis_totales["sprints"] += p_stats.get("sprints", 0)
            kpis_totales["acels"] += p_stats.get("acels", 0)
            kpis_totales["decels"] += p_stats.get("decels", 0)
            kpis_totales["hsr"] += p_stats.get("hsr", 0)
            kpis_totales["playerLoad"] += p_stats.get("pl", 0)
            kpis_totales["minutos"] += mins 
            
            if p_stats.get("max_v", 0) > kpis_totales["vmax"]:
                kpis_totales["vmax"] = p_stats.get("max_v", 0)

    if kpis_totales["minutos"] > 0:
        kpis_totales["distRelativa"] = round(kpis_totales["distancia"] / kpis_totales["minutos"], 1)

    # Gráfica de Player Load promedio
    player_load_acumulado = []
    if kpis_totales["playerLoad"] > 0 and kpis_totales["minutos"] > 0:
        media_load_por_partido = kpis_totales["playerLoad"] / partidos_jugados
        media_minutos = int(kpis_totales["minutos"] / partidos_jugados)
        if media_minutos == 0: media_minutos = 1
        
        for i in range(20): 
            minuto = int((media_minutos / 19) * i)
            load_en_minuto = int((media_load_por_partido / media_minutos) * minuto)
            player_load_acumulado.append({"minuto": minuto, "load": load_en_minuto})
    else:
        player_load_acumulado = [{"minuto": 0, "load": 0}, {"minuto": 90, "load": 0}]

    dist_trote = kpis_totales["distancia"] - kpis_totales["hsr"] - kpis_totales["sprints"]*10 
    zonas_velocidad = [
        {"name": 'Trote', "value": round((dist_trote / (kpis_totales["distancia"]+1)) * 100, 1), "color": '#f1c40f'},
        {"name": 'HSR', "value": round((kpis_totales["hsr"] / (kpis_totales["distancia"]+1)) * 100, 1), "color": '#e67e22'}
    ]

    return {
        "player": {
            "id": player.id, "name": player.name, "dorsal": player.dorsal,
            "position": player.position, "photo_url": player.photo_url
        },
        "kpis": kpis_totales,
        "historial_partidos": historial_partidos, # 💡 Lo enviamos al frontend
        "playerLoadAcumulado": player_load_acumulado,
        "zonasVelocidad": zonas_velocidad
    }

@app.get("/frames")
def get_frames():
    if datos_partido is None:
        raise HTTPException(status_code=404, detail="No hay archivo en memoria")
    return datos_partidoh