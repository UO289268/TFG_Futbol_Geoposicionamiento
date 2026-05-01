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
        resumen_stats = {} # <--- NUEVO: Para la tabla final

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
                
                # Distancia (v * 0.1s)
                distancia = (pdf['vel'].fillna(0) * 0.1).sum()
                v_max = pdf['vel'].max()
                
                # Conteo de esfuerzos (Sprints > 6.66 m/s)
                # Contamos cuántas veces la velocidad cruza el umbral hacia arriba
                sprints = ((pdf['vel'] > 6.66) & (pdf['vel'].shift(1) <= 6.66)).sum()
                
                # Conteo de Aceleraciones (> 3.0 m/s2)
                acels = ((pdf['acc'] > 3.0) & (pdf['acc'].shift(1) <= 3.0)).sum()
                
                return {
                    "dist": int(distancia),
                    "max_v": round(float(v_max), 2),
                    "sprints": int(sprints),
                    "acels": int(acels)
                }

            # Dividimos los datos para el resumen
            h1_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h1)]
            h2_data = df_sincronizado.loc[df_sincronizado.index.isin(rango_h2)]

            resumen_stats[str(dev)] = {
                "h1": get_period_stats(h1_data),
                "h2": get_period_stats(h2_data),
                "total": get_period_stats(df_sincronizado) # Puedes usar la misma lógica
            }
            # Reutilizamos la lógica para el total
            resumen_stats[str(dev)]["total"] = get_period_stats(df_sincronizado)

            # Lista de frames para el Pitch
            lista_jugador = []
            for _, row in df_sincronizado.iterrows():
                if pd.isna(row['lat']):
                    lista_jugador.append(None)
                else:
                    v, a = row['vel'], row['acc'] if not pd.isna(row['acc']) else 0
                    lista_jugador.append({
                        "lat": row['lat'], "lon": row['lon'], "vel": v, "acc": a,
                        "zona": "Sprint" if v > 6.66 else "HSR" if v > 5.83 else "HMLD" if v > 3.0 else "Trote",
                        "fuerza": "Acel" if a > 3.0 else "Decel" if a < -3.0 else "Normal"
                    })
            players_dict[str(dev)] = lista_jugador

        datos_partido = {"players": players_dict, "resumen": resumen_stats}
        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/frames")
def get_frames():
    if datos_partido is None:
        raise HTTPException(status_code=404, detail="No hay archivo")
    return datos_partido