import pandas as pd
import json

df = pd.read_excel("backend/data/Todas.xlsx",
                   usecols=["local_time", "DEV", "lat", "lon", "vel"])

frames = []
for t, group in df.groupby("local_time"):
    frame = []
    for _, row in group.iterrows():
        frame.append({
            "DEV": int(row["DEV"]),
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
            "vel": float(row["vel"])
        })
    frames.append(frame)

with open("backend/data/frames.json", "w") as f:
    json.dump(frames, f)

print("JSON generado")