from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import json
import os
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

datos_partido = None

# --- DIRECTORIOS DE DATOS ---
CAMPOS_FILE = "data/campos.json"
MATCHES_DIR = "data/matches"

# Crear la carpeta de partidos si no existe
os.makedirs(MATCHES_DIR, exist_ok=True)

def cargar_campos():
    if os.path.exists(CAMPOS_FILE):
        with open(CAMPOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.get("/fields")
def get_fields():
    return cargar_campos()

# --- NUEVO: GESTIÓN DE PARTIDOS GUARDADOS ---
@app.get("/matches")
def get_saved_matches():
    matches = []
    for filename in os.listdir(MATCHES_DIR):
        if filename.endswith(".json"):
            try:
                with open(os.path.join(MATCHES_DIR, filename), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "metadata" in data:
                        matches.append(data["metadata"])
            except:
                pass
    # Ordenar por fecha de creación (los más nuevos primero)
    matches.sort(key=lambda x: x.get("id", ""), reverse=True)
    return matches

@app.get("/matches/{match_id}")
def load_match(match_id: str):
    global datos_partido
    path = os.path.join(MATCHES_DIR, f"{match_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    with open(path, "r", encoding="utf-8") as f:
        datos_partido = json.load(f)
    
    return datos_partido
# ---------------------------------------------

@app.get("/")
def root():
    return {"message": "Backend TFG corriendo"}

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    match_name: str = Form("Partido sin nombre"), # NUEVO: Nombre del partido
    field_id: str = Form(""), 
    start_h1: str = Form(""),
    end_h1: str = Form(""),
    start_h2: str = Form(""),
    end_h2: str = Form(""),
    # --- NUEVOS UMBRALES DINÁMICOS ---
    u_sprint: float = Form(24.0), # km/h
    u_hsr: float = Form(21.0),    # km/h
    u_acel: float = Form(3.0)     # m/s2
):
    global datos_partido
    try:
        # Convertimos km/h a m/s para los cálculos internos del GPS
        ms_sprint = u_sprint / 3.6
        ms_hsr = u_hsr / 3.6

        # 1. Buscar los límites del campo seleccionado
        campos = cargar_campos()
        campo_select = next((c for c in campos if c["id"] == field_id), None)
        
        # Si por algún motivo no llega el ID pero hay campos, cogemos el primero por seguridad
        if not campo_select and len(campos) > 0:
            campo_select = campos[0]

        field_limits = None
        if campo_select:
            field_limits = {
                "maxLat": campo_select["lat_tl"],
                "minLat": campo_select["lat_br"],
                "minLon": campo_select["lon_tl"],
                "maxLon": campo_select["lon_br"]
            }

        # 2. Leer Excel
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        columnas_req = {'local_time', 'DEV', 'lat', 'lon', 'vel'}
        if not columnas_req.issubset(set(df.columns)):
            raise ValueError(f"Faltan columnas. Se requieren: {columnas_req}")

        df['timestamp'] = pd.to_datetime(df['local_time'])
        df['timestamp'] = df['timestamp'].dt.floor('100ms')
        fecha_str = str(df['timestamp'].dt.date.iloc[0])

        # LÓGICA DE RECORTE
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
            df_jugador = df[df['DEV'] == dev].drop_duplicates(subset=['timestamp']).set_index('timestamp')
            df_sincronizado = df_jugador.reindex(rango_global)
            
            # Filtro suavizado
            df_sincronizado['vel_suavizada'] = df_sincronizado['vel'].rolling(window=3, min_periods=1).mean()
            df_sincronizado['acc'] = df_sincronizado['vel_suavizada'].diff(periods=5) / 0.5
            df_sincronizado['acc'] = df_sincronizado['acc'].rolling(window=5, min_periods=1).mean()
            
            # --- CÁLCULO DE TOTALES PARA LA TABLA ---
            def get_period_stats(pdf):
                if pdf.empty or pdf['vel'].isna().all():
                    return {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0}
                
                distancia = (pdf['vel'].fillna(0) * 0.1).sum()
                v_max = pdf['vel'].max()
                
                # AHORA USA LOS UMBRALES PERSONALIZADOS
                sprints = ((pdf['vel'] > ms_sprint) & (pdf['vel'].shift(1) <= ms_sprint)).sum()
                acels = ((pdf['acc'] > u_acel) & (pdf['acc'].shift(1) <= u_acel)).sum()
                
                return {
                    "dist": int(distancia),
                    "max_v": round(float(v_max), 2),
                    "sprints": int(sprints),
                    "acels": int(acels)
                }

            h1_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h1)]
            h2_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h2)]

            resumen_stats[str(dev)] = {
                "h1": get_period_stats(h1_data),
                "h2": get_period_stats(h2_data),
                "total": get_period_stats(df_sincronizado) 
            }

            # Lista de frames para el Pitch
            lista_jugador = []
            for _, row in df_sincronizado.iterrows():
                if pd.isna(row['lat']):
                    lista_jugador.append(None)
                else:
                    v, a = row['vel'], row['acc'] if not pd.isna(row['acc']) else 0
                    
                    # CLASIFICACIÓN DE ZONAS DINÁMICA
                    zona = "Trote"
                    if v > ms_sprint: zona = "Sprint"
                    elif v > ms_hsr: zona = "HSR"
                    elif v > 3.0: zona = "HMLD"
                    
                    fuerza = "Normal"
                    if a > u_acel: fuerza = "Acel"
                    elif a < -u_acel: fuerza = "Decel"

                    lista_jugador.append({
                        "lat": row['lat'], "lon": row['lon'], "vel": v, "acc": a,
                        "zona": zona,
                        "fuerza": fuerza
                    })
            players_dict[str(dev)] = lista_jugador

        # --- NUEVO: GUARDAR EL PARTIDO EN DISCO ---
        match_id = str(uuid.uuid4()) # ID único
        
        datos_partido = {
            "metadata": {
                "id": match_id,
                "name": match_name,
                "filename": file.filename,
                "date": fecha_str,
                "field": campo_select["nombre"] if campo_select else "Desconocido"
            },
            "players": players_dict, 
            "resumen": resumen_stats, 
            "field_limits": field_limits,
            "config": {
                "u_sprint": ms_sprint, 
                "u_hsr": ms_hsr, 
                "u_acel": u_acel
            }
        }

        # Guardamos en disco
        with open(os.path.join(MATCHES_DIR, f"{match_id}.json"), "w", encoding="utf-8") as f:
            json.dump(datos_partido, f)

        return {"status": "success", "match_id": match_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/frames")
def get_frames():
    if datos_partido is None:
        raise HTTPException(status_code=404, detail="No hay archivo en memoria")
    return datos_partido