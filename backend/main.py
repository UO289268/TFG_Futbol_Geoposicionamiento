from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# 🌐 Permitir acceso desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar datos UNA VEZ
with open("data/frames.json") as f:
    frames = json.load(f)  # frames es lista de dicts con jugadores: [{DEV, lat, lon, vel, ...}, ...]

# 🔹 Reorganizar datos por jugador
players_dict = {}
for frame in frames:
    for p in frame:
        dev = str(p["DEV"])
        if dev not in players_dict:
            players_dict[dev] = []
        
        # Añadimos la velocidad ("vel") aquí para que el frontend pueda usarla
        players_dict[dev].append({
            "lat": p["lat"],
            "lon": p["lon"],
            "time": p.get("local_time", None),  # opcional
            "vel": p.get("vel", 0)  # <--- NUEVA LÍNEA: extraemos la velocidad (por defecto 0 si no existe)
        })

@app.get("/")
def root():
    return {"message": "Backend TFG corriendo"}

@app.get("/frames")
def get_frames():
    # Retorna todos los jugadores con sus trayectorias y velocidades
    return {"players": players_dict}