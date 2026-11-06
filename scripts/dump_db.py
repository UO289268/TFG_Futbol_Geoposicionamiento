"""Vuelca la base de datos SQLite del proyecto a un fichero SQL.

Uso (desde la raiz del repositorio):
    python scripts/dump_db.py                      # backend/ninetics.db -> backend/dump/ninetics_dump.sql
    python scripts/dump_db.py --sin-usuarios       # excluye la tabla users (correos y hashes)
    python scripts/dump_db.py origen.db destino.sql

Restauracion:
    sqlite3 backend/ninetics.db < backend/dump/ninetics_dump.sql

El volcado contiene el esquema y los datos de la base de datos (incluido el
resumen JSON de cada partido), pero NO las series de posicion, que estan en
backend/data/matches/*.json. Revisa su contenido antes de subirlo al
repositorio: incluye nombres y dorsales de jugadoras.
"""
import argparse
import os
import sqlite3
import sys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("origen", nargs="?", default=os.path.join("backend", "ninetics.db"))
    ap.add_argument("destino", nargs="?", default=os.path.join("backend", "dump", "ninetics_dump.sql"))
    ap.add_argument("--sin-usuarios", action="store_true", help="no volcar la tabla users")
    args = ap.parse_args()

    if not os.path.isfile(args.origen):
        sys.exit(f"No existe la base de datos: {args.origen}")
    os.makedirs(os.path.dirname(args.destino) or ".", exist_ok=True)

    con = sqlite3.connect(args.origen)
    lineas = 0
    with open(args.destino, "w", encoding="utf-8") as out:
        for linea in con.iterdump():
            if args.sin_usuarios and ('"users"' in linea or " users " in linea or "'users'" in linea):
                continue
            out.write(linea + "\n")
            lineas += 1
    con.close()
    print(f"Volcado completado: {args.destino} ({lineas} sentencias)")


if __name__ == "__main__":
    main()
