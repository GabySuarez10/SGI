from flask import Blueprint, jsonify, request
from database import db
from models import Usuario

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@usuarios_bp.route("", methods=["GET"])
def get_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([u.to_dict() for u in usuarios]), 200


@usuarios_bp.route("/<int:id>", methods=["GET"])
def get_usuario(id):
    usuario = Usuario.query.get_or_404(id, description="Usuario no encontrado")
    return jsonify(usuario.to_dict()), 200


@usuarios_bp.route("", methods=["POST"])
def create_usuario():
    data = request.get_json() or {}
    if not data.get("nombre") or not data.get("contrasena"):
        return jsonify({"error": "Nombre y contraseña son obligatorios"}), 400

    nuevo_usuario = Usuario(
        nombre=data.get("nombre"),
        contrasena=data.get("contrasena")
    )
    db.session.add(nuevo_usuario)
    db.session.commit()
    return jsonify(nuevo_usuario.to_dict()), 201


@usuarios_bp.route("/<int:id>", methods=["PUT"])
def update_usuario(id):
    usuario = Usuario.query.get_or_404(id, description="Usuario no encontrado")
    data = request.get_json() or {}

    if "nombre" in data:
        usuario.nombre = data["nombre"]
    if "contrasena" in data:
        usuario.contrasena = data["contrasena"]

    db.session.commit()
    return jsonify(usuario.to_dict()), 200


@usuarios_bp.route("/<int:id>", methods=["DELETE"])
def delete_usuario(id):
    usuario = Usuario.query.get_or_404(id, description="Usuario no encontrado")
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"message": f"Usuario con ID {id} eliminado exitosamente"}), 200
