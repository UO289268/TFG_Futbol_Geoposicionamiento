"""Mide las fases del procesamiento de un partido con la version inicial y la optimizada.

Uso (desde la raiz del repositorio, con el entorno virtual activo):
    python scripts/medir_fases.py ruta/Todas.xlsx

Reproduce la logica del endpoint POST /upload de backend/main.py con las franjas
12:02-12:48 y 13:03-13:50 y los umbrales de la categoria Cadete Femenino
(19 / 16 km/h, 2,2 m/s2). Mide la lectura del Excel con openpyxl y con calamine,
la preparacion, el calculo, el resumen, la generacion de fotogramas (bucle antiguo
con iterrows y version vectorizada) y la serializacion a JSON, y comprueba que las
dos versiones producen el mismo resumen y los mismos fotogramas (seccion 7.3).
"""
import io, json, os, platform, sys, time
import numpy as np
import pandas as pd

ruta = sys.argv[1]
contenido = open(ruta, "rb").read()
print(f"Equipo: {platform.processor() or platform.machine()} | {os.cpu_count()} nucleos | Python {platform.python_version()} | Pandas {pd.__version__} | {platform.system()} {platform.release()}")

t = time.perf_counter(); df_a = pd.read_excel(io.BytesIO(contenido)); t_openpyxl = time.perf_counter() - t
t = time.perf_counter(); df = pd.read_excel(io.BytesIO(contenido), engine="calamine"); t_calamine = time.perf_counter() - t
print(f"Lectura openpyxl: {t_openpyxl:.1f} s | calamine: {t_calamine:.1f} s | filas: {len(df)} | mismos datos: {df_a.equals(df)}")
del df_a

ms_sprint, ms_hsr, u_acel = 19 / 3.6, 16 / 3.6, 2.2
t = time.perf_counter()
df["vel"] = df["vel"] / 3.6
df["timestamp"] = pd.to_datetime(df["local_time"]).dt.floor("100ms")
fecha = str(df["timestamp"].dt.date.iloc[0])
a1, b1, a2, b2 = [pd.to_datetime(f"{fecha} {h}") for h in ("12:02", "12:48", "13:03", "13:50")]
r1 = pd.date_range(a1, b1, freq="100ms"); r2 = pd.date_range(a2, b2, freq="100ms"); rg = r1.union(r2)
df = df[(df["timestamp"] >= a1) & (df["timestamp"] <= b1) | (df["timestamp"] >= a2) & (df["timestamp"] <= b2)]
t_prep = time.perf_counter() - t


def cinematica(d):
    d = d.copy()
    d["vel_suavizada"] = d["vel"].rolling(window=3, min_periods=1).mean()
    d["acc"] = d["vel_suavizada"].diff(periods=5) / 0.5
    d["acc"] = d["acc"].rolling(window=5, min_periods=1).mean()
    d["jerk_abs"] = d["acc"].diff().abs()
    d["pl_frame"] = d["jerk_abs"] * 0.02
    return d


def stats(pdf):
    # Copia de get_period_stats de backend/main.py
    if pdf.empty or pdf["vel"].isna().all():
        return {"dist": 0, "max_v": 0, "sprints": 0, "acels": 0, "decels": 0, "hsr": 0, "pl": 0, "mins": 0}
    segundos_activos = len(pdf["vel"].dropna().index.floor("s").unique())
    minutos = int(segundos_activos / 60)
    if minutos == 0 and segundos_activos > 0:
        minutos = 1
    distancia = (pdf["vel"].fillna(0) * 0.1).sum()
    hsr_dist = (pdf.loc[pdf["vel"] > ms_hsr, "vel"].fillna(0) * 0.1).sum()
    v_max = pdf["vel"].max()
    sprints = ((pdf["vel"] > ms_sprint) & (pdf["vel"].shift(1) <= ms_sprint)).sum()
    acels = ((pdf["acc"] > u_acel) & (pdf["acc"].shift(1) <= u_acel)).sum()
    decels = ((pdf["acc"] < -u_acel) & (pdf["acc"].shift(1) >= -u_acel)).sum()
    player_load = pdf["pl_frame"].sum()
    return {"dist": int(distancia), "max_v": round(float(v_max), 2),
            "sprints": int(sprints), "acels": int(acels), "decels": int(decels),
            "hsr": int(hsr_dist), "pl": int(player_load), "mins": minutos}


def bucle_antiguo(d):
    L = []
    for _, row in d.iterrows():
        if pd.isna(row["lat"]):
            L.append(None)
        else:
            v, a, pl = row["vel"], row["acc"] if not pd.isna(row["acc"]) else 0, row["pl_frame"] if not pd.isna(row["pl_frame"]) else 0
            zona = "Trote"
            if v > ms_sprint: zona = "Sprint"
            elif v > ms_hsr: zona = "HSR"
            elif v > 3.0: zona = "HMLD"
            f = "Normal"
            if a > u_acel: f = "Acel"
            elif a < -u_acel: f = "Decel"
            L.append({"lat": row["lat"], "lon": row["lon"], "vel": v, "acc": a, "zona": zona, "fuerza": f, "pl": pl})
    return L


def bucle_nuevo(d):
    v = d["vel"].to_numpy(); a = d["acc"].fillna(0).to_numpy(); pl = d["pl_frame"].fillna(0).to_numpy()
    zona = np.select([v > ms_sprint, v > ms_hsr, v > 3.0], ["Sprint", "HSR", "HMLD"], default="Trote")
    fz = np.select([a > u_acel, a < -u_acel], ["Acel", "Decel"], default="Normal")
    reg = pd.DataFrame({"lat": d["lat"].to_numpy(), "lon": d["lon"].to_numpy(), "vel": v, "acc": a,
                        "zona": zona, "fuerza": fz, "pl": pl}).to_dict("records")
    return [None if m else r for m, r in zip(d["lat"].isna().to_numpy(), reg)]


def procesar(bucle):
    tiempos = {"calculo": 0.0, "resumen": 0.0, "bucle": 0.0}
    players, resumen = {}, {}
    for dev in df["DEV"].unique():
        t = time.perf_counter()
        d = df[df["DEV"] == dev].drop_duplicates(subset=["timestamp"]).set_index("timestamp").reindex(rg)
        d = pd.concat([cinematica(d.loc[d.index.isin(r)]) for r in (r1, r2)])
        d = d[~d.index.duplicated()]
        tiempos["calculo"] += time.perf_counter() - t
        t = time.perf_counter()
        resumen[str(dev)] = {"h1": stats(d.loc[d.index.isin(r1)]), "h2": stats(d.loc[d.index.isin(r2)]), "total": stats(d)}
        tiempos["resumen"] += time.perf_counter() - t
        t = time.perf_counter()
        players[str(dev)] = bucle(d)
        tiempos["bucle"] += time.perf_counter() - t
    return tiempos, players, resumen


tv, players_v, resumen_v = procesar(bucle_antiguo)
t = time.perf_counter(); texto = json.dumps({"players": players_v, "resumen": resumen_v}); t_json = time.perf_counter() - t
tam = len(texto.encode("utf-8")) / 2**20
del texto
tn, players_n, resumen_n = procesar(bucle_nuevo)


def iguales(x, y):
    # Compara por valor, como scripts/comparar_partidos.py (0 y 0.0 son iguales; NaN == NaN)
    if isinstance(x, (int, float)) and isinstance(y, (int, float)):
        return (x != x and y != y) or x == y
    if isinstance(x, dict) and isinstance(y, dict):
        return x.keys() == y.keys() and all(iguales(x[k], y[k]) for k in x)
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(iguales(a, b) for a, b in zip(x, y))
    return x == y


fotogramas_iguales = iguales(players_v, players_n)

print(f"Preparacion (unidades, marcas de tiempo, franjas): {t_prep:.1f} s")
print(f"ANTIGUA  calculo vectorizado: {tv['calculo']:.1f} s | resumen: {tv['resumen']:.1f} s | bucle de fotogramas: {tv['bucle']:.1f} s | total sin lectura: {sum(tv.values()):.1f} s")
print(f"NUEVA    calculo vectorizado: {tn['calculo']:.1f} s | resumen: {tn['resumen']:.1f} s | bucle de fotogramas: {tn['bucle']:.1f} s | total sin lectura: {sum(tn.values()):.1f} s")
print(f"Serializacion JSON: {t_json:.1f} s | tamano JSON: {tam:.1f} MB")
print(f"Resumen identico entre versiones: {resumen_v == resumen_n} | fotogramas identicos: {fotogramas_iguales}")