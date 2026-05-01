from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable global para guardar los datos procesados en la memoria del servidor
datos_partido = None

@app.get("/")
def root():
    return {"message": "Backend TFG corriendo"}

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    start_h1: str = Form(""),
    end_h1: str = Form(""),
    start_h2: str = Form(""),
    end_h2: str = Form("")
):
    global datos_partido
    try:
        # 1. Leer el archivo Excel directamente desde la memoria
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # 2. Validar que el Excel tiene las columnas correctas
        columnas_req = {'local_time', 'DEV', 'lat', 'lon', 'vel'}
        if not columnas_req.issubset(set(df.columns)):
            raise ValueError(f"El Excel no tiene las columnas correctas. Se requieren: {columnas_req}")

        # 3. Procesar la línea de tiempo base
        df['timestamp'] = pd.to_datetime(df['local_time'])
        df['timestamp'] = df['timestamp'].dt.floor('100ms')
        
        # Sacamos la fecha del partido automáticamente de la primera fila
        fecha_str = str(df['timestamp'].dt.date.iloc[0])

        # ✂️ --- LÓGICA DE RECORTE DE TIEMPOS --- ✂️
        # Si el usuario ha rellenado las horas, creamos las dos partes y quitamos lo irrelevante
        if start_h1 and end_h1 and start_h2 and end_h2:
            t_start_h1 = pd.to_datetime(f"{fecha_str} {start_h1}")
            t_end_h1 = pd.to_datetime(f"{fecha_str} {end_h1}")
            t_start_h2 = pd.to_datetime(f"{fecha_str} {start_h2}")
            t_end_h2 = pd.to_datetime(f"{fecha_str} {end_h2}")
            
            rango_h1 = pd.date_range(start=t_start_h1, end=t_end_h1, freq='100ms')
            rango_h2 = pd.date_range(start=t_start_h2, end=t_end_h2, freq='100ms')
            
            # Unimos la 1ª y 2ª parte saltándonos el descanso
            rango_global = rango_h1.union(rango_h2)
            
            # Filtramos el Excel original para que no procese basura
            mask1 = (df['timestamp'] >= t_start_h1) & (df['timestamp'] <= t_end_h1)
            mask2 = (df['timestamp'] >= t_start_h2) & (df['timestamp'] <= t_end_h2)
            df = df[mask1 | mask2]
        else:
            # Si no ponen tiempos, cogemos todo el archivo como hacíamos antes
            start_time = df['timestamp'].min()
            end_time = df['timestamp'].max()
            rango_global = pd.date_range(start=start_time, end=end_time, freq='100ms')
        # ----------------------------------------

        players_dict = {}
        dorsales = df['DEV'].unique()

        # 4. Cálculo de métricas avanzadas y suavizado para cada jugador
        for dev in dorsales:
            df_jugador = df[df['DEV'] == dev].drop_duplicates(subset=['timestamp']).set_index('timestamp')
            df_sincronizado = df_jugador.reindex(rango_global)
            
            # --- El filtro profesional (Media Móvil de 0.5s) ---
            df_sincronizado['vel_suavizada'] = df_sincronizado['vel'].rolling(window=3, min_periods=1).mean()
            df_sincronizado['acc'] = df_sincronizado['vel_suavizada'].diff(periods=5) / 0.5
            df_sincronizado['acc'] = df_sincronizado['acc'].rolling(window=5, min_periods=1).mean()
            # ---------------------------------------------------
            
            lista_jugador = []
            for _, row in df_sincronizado.iterrows():
                if pd.isna(row['lat']):
                    lista_jugador.append(None)
                else:
                    v = row['vel']
                    a = row['acc'] if not pd.isna(row['acc']) else 0
                    
                    # Clasificación Carga Externa
                    zona = "Trote"
                    if v > 6.66: zona = "Sprint"       # > 24 km/h
                    elif v > 5.83: zona = "HSR"        # > 21 km/h
                    elif v > 3.0: zona = "HMLD"        # > 3 m/s
                    
                    tipo_fuerza = "Normal"
                    if a > 3.0: tipo_fuerza = "Acel"   # +3 m/s2
                    elif a < -3.0: tipo_fuerza = "Decel" # -3 m/s2

                    lista_jugador.append({
                        "lat": row['lat'], 
                        "lon": row['lon'], 
                        "vel": v, 
                        "acc": a, 
                        "zona": zona, 
                        "fuerza": tipo_fuerza
                    })
            players_dict[str(dev)] = lista_jugador

        # 5. Guardar en la variable global para que React lo pueda pedir luego
        datos_partido = {"players": players_dict}
        return {"status": "success", "message": "Archivo procesado y sincronizado correctamente"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/frames")
def get_frames():
    # Si React pide los frames y todavía no se ha subido ningún Excel, damos error
    if datos_partido is None:
        raise HTTPException(status_code=404, detail="Aún no se ha cargado ningún archivo")
    return datos_partido