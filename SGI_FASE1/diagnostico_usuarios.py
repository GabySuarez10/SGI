"""
Muestra qué usuarios hay en la tabla usuarios de la base configurada en .env.
Uso (desde SGI_FASE1, con el entorno virtual activo):  python diagnostico_usuarios.py
"""
from app import app
from database import db

with app.app_context():
    print("Base de datos:", db.engine.url.render_as_string(hide_password=True))
    filas = db.session.execute(db.text(
        "SELECT id, nombre, contrasena, pg_typeof(contrasena)::text FROM usuarios ORDER BY id"
    )).all()
    if not filas:
        print("La tabla usuarios está VACÍA: ejecuta el INSERT de datos de prueba en Neon.")
    for id_, nombre, contrasena, tipo in filas:
        print(f"id={id_}  nombre={nombre!r}  contrasena={contrasena!r}  tipo={tipo}")
