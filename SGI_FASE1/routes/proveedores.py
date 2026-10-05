from flask import Blueprint, jsonify, request
from database import db
from models import Proveedor

proveedores_bp = Blueprint("proveedores", __name__, url_prefix="/api/proveedores")


@proveedores_bp.route("", methods=["GET"])
def get_proveedores():
    proveedores = Proveedor.query.all()
    return jsonify([p.to_dict() for p in proveedores]), 200


@proveedores_bp.route("/<string:nombre>", methods=["GET"])
def get_proveedor(nombre):
    proveedor = Proveedor.query.get_or_404(nombre, description="Proveedor no encontrado")
    return jsonify(proveedor.to_dict()), 200


@proveedores_bp.route("", methods=["POST"])
def create_proveedor():
    data = request.get_json() or {}
    if not data.get("nombre"):
        return jsonify({"error": "El campo nombre es obligatorio"}), 400

    proveedor_existente = Proveedor.query.get(data.get("nombre"))
    if proveedor_existente:
        return jsonify({"error": f"Ya existe un proveedor con el nombre '{data.get('nombre')}'"}), 400

    nuevo_proveedor = Proveedor(
        nombre=data.get("nombre"),
        telefono=data.get("telefono"),
        direccion=data.get("direccion"),
        ciudad=data.get("ciudad"),
        descripcion=data.get("descripcion")
    )

    db.session.add(nuevo_proveedor)
    db.session.commit()
    return jsonify(nuevo_proveedor.to_dict()), 201


@proveedores_bp.route("/<string:nombre>", methods=["PUT"])
def update_proveedor(nombre):
    proveedor = Proveedor.query.get_or_404(nombre, description="Proveedor no encontrado")
    data = request.get_json() or {}

    if "telefono" in data:
        proveedor.telefono = data["telefono"]
    if "direccion" in data:
        proveedor.direccion = data["direccion"]
    if "ciudad" in data:
        proveedor.ciudad = data["ciudad"]
    if "descripcion" in data:
        proveedor.descripcion = data["descripcion"]

    db.session.commit()
    return jsonify(proveedor.to_dict()), 200


@proveedores_bp.route("/<string:nombre>", methods=["DELETE"])
def delete_proveedor(nombre):
    proveedor = Proveedor.query.get_or_404(nombre, description="Proveedor no encontrado")
    db.session.delete(proveedor)
    db.session.commit()
    return jsonify({"message": f"Proveedor '{nombre}' eliminado exitosamente"}), 200
