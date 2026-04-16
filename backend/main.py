from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar el JSON que acabamos de generar con el script
with open("data/frames_sincronizados.json") as f:
    data = json.load(f)

@app.get("/")
def root():
    return {"message": "Backend TFG corriendo"}

@app.get("/frames")
def get_frames():
    # Ya está en el formato perfecto {"players": {"10": [...], "9": [...]}}
    return data