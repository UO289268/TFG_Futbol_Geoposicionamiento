import pandas as pd
import json

print("1. Cargando datos del Excel...")
# Cambia 'datos.xlsx' por el nombre real de tu archivo
df = pd.read_excel("data/Todas.xlsx") 

print("2. Procesando la línea de tiempo...")
df['timestamp'] = pd.to_datetime(df['local_time'])

# Redondeamos el tiempo a intervalos exactos (ej. cada 100ms = 10 frames por segundo)
df['timestamp'] = df['timestamp'].dt.floor('100ms')

# Buscamos la hora absoluta de inicio y fin de toda la sesión
start_time = df['timestamp'].min()
end_time = df['timestamp'].max()
print(f"Inicio global: {start_time}")
print(f"Fin global: {end_time}")

# Creamos la línea de tiempo MAESTRA
rango_global = pd.date_range(start=start_time, end=end_time, freq='100ms')

players_dict = {}
dorsales = df['DEV'].unique()

print("3. Sincronizando jugadores y calculando métricas avanzadas...")
for dev in dorsales:
    # 1. Aislamos al jugador
    df_jugador = df[df['DEV'] == dev].drop_duplicates(subset=['timestamp']).set_index('timestamp')
    
    # 2. Reindexamos a la línea de tiempo MAESTRA
    df_sincronizado = df_jugador.reindex(rango_global)
    
    # --- CÁLCULO DE ACELERACIÓN ---
    # Calculamos la aceleración antes de iterar
    df_sincronizado['acc'] = df_sincronizado['vel'].diff() / 0.1
    
    # 3. Convertimos a lista con todas las métricas en un solo bucle
    lista_jugador = []
    for _, row in df_sincronizado.iterrows():
        if pd.isna(row['lat']):
            lista_jugador.append(None)
        else:
            v = row['vel']
            a = row['acc'] if not pd.isna(row['acc']) else 0
            
            # Clasificación según tu esquema:
            zona = "Trote"
            if v > 6.66: zona = "Sprint"       # > 24 km/h
            elif v > 5.83: zona = "HSR"        # > 21 km/h
            elif v > 3.0: zona = "HMLD"        # > 3 m/s
            
            # Clasificación de Fuerza (Aceleraciones)
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

print("4. Guardando JSON sincronizado...")
with open("data/frames_sincronizados.json", "w") as f:
    json.dump({"players": players_dict}, f)

print("¡Terminado! Ahora el partido está perfectamente alineado y con métricas.")