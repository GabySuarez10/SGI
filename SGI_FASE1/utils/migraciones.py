"""
Aplica los archivos .sql de la carpeta migraciones/ en orden alfabético.

Todas las migraciones son idempotentes (IF NOT EXISTS / ON CONFLICT), así que
se ejecutan cada vez que arranca la API sin duplicar ni borrar datos.
"""

import os

from database import db

CARPETA = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migraciones")


def _sentencias(texto):
    """Quita comentarios '--' y separa el archivo por ';'."""
    lineas = [linea.split("--", 1)[0] for linea in texto.splitlines()]
    return [s.strip() for s in "\n".join(lineas).split(";") if s.strip()]


def aplicar_migraciones(logger=None):
    """
    Cada sentencia corre en su propia transacción: si una falla (por ejemplo
    un ALTER que la base no permite) se registra el error y se sigue con las demás.
    """
    archivos = sorted(f for f in os.listdir(CARPETA) if f.endswith(".sql"))
    for archivo in archivos:
        with open(os.path.join(CARPETA, archivo), encoding="utf-8") as f:
            sentencias = _sentencias(f.read())
        errores = 0
        for sentencia in sentencias:
            try:
                with db.engine.begin() as conexion:
                    conexion.execute(db.text(sentencia))
            except Exception as error:  # noqa: BLE001
                errores += 1
                if logger:
                    logger.warning("Migración %s: no se pudo ejecutar %r -> %s",
                                   archivo, sentencia[:80], error)
        if logger:
            logger.info("Migración %s: %d sentencias, %d con error", archivo, len(sentencias), errores)
