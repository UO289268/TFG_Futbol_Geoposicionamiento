import pandas as pd
import json

print("1. Cargando datos del Excel...")
# Cambia 'datos.xlsx' por el nombre real de tu archivo
df = pd.read_excel("data/Todas.xlsx") 

print("2. Procesando la línea de tiempo...")
# Nos aseguramos de tener una columna DateTime unificada.
# Si ya tienes 'local_time' en formato fecha, usamos esa. 
# (Ajusta los nombres de las columnas a como vengan en tu Excel: 'lat', 'long', 'vel')
df['timestamp'] = pd.to_datetime(df['local_time'])

# Redondeamos el tiempo a intervalos exactos (ej. cada 100ms = 10 frames por segundo)
# Si tu GPS guarda datos cada 1 segundo, cambia '100ms' por '1S'
df['timestamp'] = df['timestamp'].dt.floor('100ms')

# Buscamos la hora absoluta de inicio y fin de toda la sesión
start_time = df['timestamp'].min()
end_time = df['timestamp'].max()
print(f"Inicio global: {start_time}")
print(f"Fin global: {end_time}")

# Creamos la línea de tiempo MAESTRA (todos los frames del partido existan datos o no)
rango_global = pd.date_range(start=start_time, end=end_time, freq='100ms')

players_dict = {}
dorsales = df['DEV'].unique()

print("3. Sincronizando jugadores (esto puede tardar unos segundos)...")
for dev in dorsales:
    # 1. Aislamos al jugador y borramos posibles duplicados en un mismo milisegundo
    df_jugador = df[df['DEV'] == dev].drop_duplicates(subset=['timestamp']).set_index('timestamp')
    
    # 2. Reindexamos a la línea de tiempo MAESTRA. 
    # Donde el jugador no tenga datos, Pandas pondrá "NaN" (Not a Number)
    df_sincronizado = df_jugador.reindex(rango_global)
    
    # 3. Convertimos a lista para el JSON
    lista_jugador = []
    for _, row in df_sincronizado.iterrows():
        # Si la latitud es nula, es que en este frame el jugador no estaba
        if pd.isna(row['lat']):
            lista_jugador.append(None) 
        else:
            lista_jugador.append({
                "lat": row['lat'],
                "lon": row['lon'],
                "vel": row['vel']
            })
            
    players_dict[str(dev)] = lista_jugador

print("4. Guardando JSON sincronizado...")
with open("data/frames_sincronizados.json", "w") as f:
    json.dump({"players": players_dict}, f)

print("¡Terminado! Ahora el partido está perfectamente alineado.")