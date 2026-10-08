import hmac

from flask import current_app

from database import db
from models import Usuario
from queries.comunes import obtener_o_404
from utils.errores import ErrorAPI


def listar_usuarios():
    return Usuario.query.order_by(Usuario.id).all()


def obtener_usuario(id_usuario):
    return obtener_o_404(Usuario, id_usuario, "Usuario no encontrado")


def _buscar_por_nombre(nombre):
    # trim(): si la columna es CHAR(n), PostgreSQL la rellena con espacios
    return Usuario.query.filter(
        db.func.lower(db.func.trim(Usuario.nombre)) == nombre.strip().lower()
    ).first()


def crear_usuario(data):
    nombre = (data.get("nombre") or "").strip()
    contrasena = data.get("contrasena") or ""

    if not nombre or not contrasena:
        raise ErrorAPI("Nombre de usuario y contraseña son obligatorios")
    if len(contrasena) < 6:
        raise ErrorAPI("La contraseña debe tener al menos 6 caracteres")
    if _buscar_por_nombre(nombre):
        raise ErrorAPI(f"El usuario '{nombre}' ya existe", 409)

    usuario = Usuario(nombre=nombre, contrasena=contrasena)
    db.session.add(usuario)
    db.session.commit()
    return usuario


def actualizar_usuario(id_usuario, data):
    usuario = obtener_usuario(id_usuario)

    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            raise ErrorAPI("El nombre de usuario no puede estar vacío")
        otro = _buscar_por_nombre(nombre)
        if otro and otro.id != usuario.id:
            raise ErrorAPI(f"El usuario '{nombre}' ya existe", 409)
        usuario.nombre = nombre

    if data.get("contrasena"):
        if len(data["contrasena"]) < 6:
            raise ErrorAPI("La contraseña debe tener al menos 6 caracteres")
        usuario.contrasena = data["contrasena"]

    db.session.commit()
    return usuario


def eliminar_usuario(id_usuario):
    usuario = obtener_usuario(id_usuario)
    db.session.delete(usuario)
    db.session.commit()


def iniciar_sesion(nombre, contrasena):
    """Devuelve el usuario si nombre y contraseña coinciden; si no, error 401."""
    if not nombre or not contrasena:
        raise ErrorAPI("Ingresa el usuario y la contraseña")

    usuario = _buscar_por_nombre(nombre)
    if usuario is None:
        current_app.logger.warning("Login fallido: no existe el usuario %r en la tabla usuarios", nombre)
        raise ErrorAPI("Usuario o contraseña incorrectos", 401)

    # Se ignoran espacios al inicio/fin: las columnas CHAR(n) devuelven
    # la contraseña rellena con espacios hasta completar el tamaño.
    guardada = (usuario.contrasena or "").strip()
    if not hmac.compare_digest(guardada.encode(), contrasena.strip().encode()):
        current_app.logger.warning(
            "Login fallido: contraseña incorrecta para %r (largo guardado=%d, largo recibido=%d)",
            usuario.nombre, len(guardada), len(contrasena.strip()),
        )
        raise ErrorAPI("Usuario o contraseña incorrectos", 401)
    return usuario
