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
    frames = json.load(f)  # frames es lista de dicts con jugadores: [{DEV, lat, lon, ...}, ...]

# 🔹 Reorganizar datos por jugador
players_dict = {}
for frame in frames:
    for p in frame:
        dev = str(p["DEV"])
        if dev not in players_dict:
            players_dict[dev] = []
        players_dict[dev].append({
            "lat": p["lat"],
            "lon": p["lon"],
            "time": p.get("local_time", None)  # opcional
        })

@app.get("/")
def root():
    return {"message": "Backend TFG corriendo"}

@app.get("/frames")
def get_frames():
    # Retorna todos los jugadores con sus trayectorias
    return {"players": players_dict}