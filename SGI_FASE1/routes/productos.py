from flask import Blueprint, jsonify, request
from database import db
from models import Producto

productos_bp = Blueprint("productos", __name__, url_prefix="/api/productos")


@productos_bp.route("", methods=["GET"])
def get_productos():
    productos = Producto.query.all()
    return jsonify([p.to_dict() for p in productos]), 200


@productos_bp.route("/<int:codigo>", methods=["GET"])
def get_producto(codigo):
    producto = Producto.query.get_or_404(codigo, description="Producto no encontrado")
    return jsonify(producto.to_dict()), 200


@productos_bp.route("", methods=["POST"])
def create_producto():
    data = request.get_json() or {}

    nuevo_producto = Producto(
        referencia=data.get("referencia"),
        nombre=data.get("nombre"),
        imagen=data.get("imagen"),
        proveedor=data.get("proveedor"),
        tamano=data.get("tamano"),
        descripcion=data.get("descripcion"),
        costo=data.get("costo", 0)
    )

    db.session.add(nuevo_producto)
    db.session.commit()
    db.session.refresh(nuevo_producto)
    return jsonify(nuevo_producto.to_dict()), 201


@productos_bp.route("/<int:codigo>", methods=["PUT"])
def update_producto(codigo):
    producto = Producto.query.get_or_404(codigo, description="Producto no encontrado")
    data = request.get_json() or {}

    if "referencia" in data:
        producto.referencia = data["referencia"]
    if "nombre" in data:
        producto.nombre = data["nombre"]
    if "imagen" in data:
        producto.imagen = data["imagen"]
    if "proveedor" in data:
        producto.proveedor = data["proveedor"]
    if "tamano" in data:
        producto.tamano = data["tamano"]
    if "descripcion" in data:
        producto.descripcion = data["descripcion"]
    if "costo" in data:
        producto.costo = data["costo"]

    db.session.commit()
    db.session.refresh(producto)
    return jsonify(producto.to_dict()), 200


@productos_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_producto(codigo):
    producto = Producto.query.get_or_404(codigo, description="Producto no encontrado")
    db.session.delete(producto)
    db.session.commit()
    return jsonify({"message": f"Producto con código {codigo} eliminado exitosamente"}), 200
