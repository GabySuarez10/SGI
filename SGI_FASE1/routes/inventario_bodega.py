from flask import Blueprint, jsonify, request
from database import db
from models import InventarioBodega

inventario_bodega_bp = Blueprint("inventario_bodega", __name__, url_prefix="/api/inventario-bodega")


@inventario_bodega_bp.route("", methods=["GET"])
def get_inventario_bodega():
    items = InventarioBodega.query.all()
    return jsonify([item.to_dict() for item in items]), 200


@inventario_bodega_bp.route("/<int:codigo>", methods=["GET"])
def get_item_inventario_bodega(codigo):
    item = InventarioBodega.query.get_or_404(codigo, description="Ítem de inventario bodega no encontrado")
    return jsonify(item.to_dict()), 200


@inventario_bodega_bp.route("", methods=["POST"])
def create_inventario_bodega():
    data = request.get_json() or {}

    nuevo_item = InventarioBodega(
        codigo=data.get("codigo"),
        nombre=data.get("nombre"),
        imagen=data.get("imagen"),
        proveedor=data.get("proveedor"),
        tamano=data.get("tamano"),
        descripcion=data.get("descripcion"),
        costo=data.get("costo", 0),
        existencias=data.get("existencias", 0)
    )

    db.session.add(nuevo_item)
    db.session.commit()
    return jsonify(nuevo_item.to_dict()), 201


@inventario_bodega_bp.route("/<int:codigo>", methods=["PUT"])
def update_inventario_bodega(codigo):
    item = InventarioBodega.query.get_or_404(codigo, description="Ítem de inventario bodega no encontrado")
    data = request.get_json() or {}

    if "nombre" in data:
        item.nombre = data["nombre"]
    if "imagen" in data:
        item.imagen = data["imagen"]
    if "proveedor" in data:
        item.proveedor = data["proveedor"]
    if "tamano" in data:
        item.tamano = data["tamano"]
    if "descripcion" in data:
        item.descripcion = data["descripcion"]
    if "costo" in data:
        item.costo = data["costo"]
    if "existencias" in data:
        item.existencias = data["existencias"]

    db.session.commit()
    return jsonify(item.to_dict()), 200


@inventario_bodega_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_inventario_bodega(codigo):
    item = InventarioBodega.query.get_or_404(codigo, description="Ítem de inventario bodega no encontrado")
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": f"Ítem de inventario bodega con código {codigo} eliminado exitosamente"}), 200
