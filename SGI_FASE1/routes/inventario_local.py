from flask import Blueprint, jsonify, request
from database import db
from models import InventarioLocal

inventario_local_bp = Blueprint("inventario_local", __name__, url_prefix="/api/inventario-local")


@inventario_local_bp.route("", methods=["GET"])
def get_inventario_local():
    items = InventarioLocal.query.all()
    return jsonify([item.to_dict() for item in items]), 200


@inventario_local_bp.route("/<int:codigo>", methods=["GET"])
def get_item_inventario_local(codigo):
    item = InventarioLocal.query.get_or_404(codigo, description="Ítem de inventario local no encontrado")
    return jsonify(item.to_dict()), 200


@inventario_local_bp.route("", methods=["POST"])
def create_inventario_local():
    data = request.get_json() or {}

    nuevo_item = InventarioLocal(
        codigo=data.get("codigo"),
        nombre=data.get("nombre"),
        imagen=data.get("imagen"),
        proveedor=data.get("proveedor"),
        tamano=data.get("tamano"),
        existencias=data.get("existencias", 0),
        precio_venta=data.get("precio_venta", 0),
        precio_mayorista=data.get("precio_mayorista", 0)
    )

    db.session.add(nuevo_item)
    db.session.commit()
    return jsonify(nuevo_item.to_dict()), 201


@inventario_local_bp.route("/<int:codigo>", methods=["PUT"])
def update_inventario_local(codigo):
    item = InventarioLocal.query.get_or_404(codigo, description="Ítem de inventario local no encontrado")
    data = request.get_json() or {}

    if "nombre" in data:
        item.nombre = data["nombre"]
    if "imagen" in data:
        item.imagen = data["imagen"]
    if "proveedor" in data:
        item.proveedor = data["proveedor"]
    if "tamano" in data:
        item.tamano = data["tamano"]
    if "existencias" in data:
        item.existencias = data["existencias"]
    if "precio_venta" in data:
        item.precio_venta = data["precio_venta"]
    if "precio_mayorista" in data:
        item.precio_mayorista = data["precio_mayorista"]

    db.session.commit()
    return jsonify(item.to_dict()), 200


@inventario_local_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_inventario_local(codigo):
    item = InventarioLocal.query.get_or_404(codigo, description="Ítem de inventario local no encontrado")
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": f"Ítem de inventario local con código {codigo} eliminado exitosamente"}), 200
