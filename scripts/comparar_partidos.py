"""Compara dos partidos procesados (ficheros de backend/data/matches) y dice si son equivalentes.

Uso (desde la raiz del repositorio):
    python scripts/comparar_partidos.py backend/data/matches/ANTES.json backend/data/matches/DESPUES.json

Compara el resumen de metricas y todos los fotogramas de cada jugadora. Los numeros se
comparan por valor (0 y 0.0 son iguales) y los textos (zona, fuerza) de forma exacta.
"""
import json
import math
import sys


def iguales(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if math.isnan(a) and math.isnan(b):
            return True
        return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


def main(ruta_a, ruta_b):
    with open(ruta_a, encoding="utf-8") as f:
        A = json.load(f)
    with open(ruta_b, encoding="utf-8") as f:
        B = json.load(f)

    problemas = []
    if A["resumen"] != B["resumen"]:
        for dev in sorted(set(A["resumen"]) | set(B["resumen"])):
            if A["resumen"].get(dev) != B["resumen"].get(dev):
                problemas.append(f"Resumen distinto para el dispositivo {dev}")

    total = distintos = 0
    for dev in sorted(set(A["players"]) | set(B["players"])):
        fa, fb = A["players"].get(dev), B["players"].get(dev)
        if fa is None or fb is None or len(fa) != len(fb):
            problemas.append(f"El dispositivo {dev} no tiene los mismos fotogramas")
            continue
        for i, (x, y) in enumerate(zip(fa, fb)):
            total += 1
            if (x is None) != (y is None):
                distintos += 1
            elif x is not None and (x.keys() != y.keys() or not all(iguales(x[k], y[k]) for k in x)):
                distintos += 1
                if distintos <= 5:
                    problemas.append(f"Dispositivo {dev}, fotograma {i}: {x} != {y}")

    print(f"Fotogramas comparados: {total}; distintos: {distintos}")
    if problemas or distintos:
        print("RESULTADO: DIFERENTES")
        for p in problemas[:20]:
            print(" -", p)
        sys.exit(1)
    print("RESULTADO: IGUALES (mismo resumen y mismos fotogramas)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
