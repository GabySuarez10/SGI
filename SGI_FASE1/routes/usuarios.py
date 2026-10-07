from flask import Blueprint, jsonify, request

from queries import usuario_queries as q

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@usuarios_bp.get("")
def listar():
    return jsonify([u.to_dict() for u in q.listar_usuarios()])


@usuarios_bp.get("/<int:id_usuario>")
def obtener(id_usuario):
    return jsonify(q.obtener_usuario(id_usuario).to_dict())


@usuarios_bp.post("")
def crear():
    """Registro de un usuario nuevo: { nombre, contrasena }"""
    return jsonify(q.crear_usuario(request.get_json() or {}).to_dict()), 201


@usuarios_bp.post("/login")
def login():
    """Inicio de sesión: { nombre, contrasena } -> datos del usuario"""
    data = request.get_json() or {}
    usuario = q.iniciar_sesion(data.get("nombre"), data.get("contrasena"))
    return jsonify(usuario.to_dict())


@usuarios_bp.put("/<int:id_usuario>")
def actualizar(id_usuario):
    return jsonify(q.actualizar_usuario(id_usuario, request.get_json() or {}).to_dict())


@usuarios_bp.delete("/<int:id_usuario>")
def eliminar(id_usuario):
    q.eliminar_usuario(id_usuario)
    return jsonify({"message": f"Usuario {id_usuario} eliminado"})
