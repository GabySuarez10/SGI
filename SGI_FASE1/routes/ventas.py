from datetime import datetime
from flask import Blueprint, jsonify, request
from database import db
from models import Venta

ventas_bp = Blueprint("ventas", __name__, url_prefix="/api/ventas")


@ventas_bp.route("", methods=["GET"])
def get_ventas():
    ventas = Venta.query.all()
    return jsonify([v.to_dict() for v in ventas]), 200


@ventas_bp.route("/<int:codigo>", methods=["GET"])
def get_venta(codigo):
    venta = Venta.query.get_or_404(codigo, description="Venta no encontrada")
    return jsonify(venta.to_dict()), 200


@ventas_bp.route("", methods=["POST"])
def create_venta():
    data = request.get_json() or {}

    nueva_venta = Venta(
        producto=data.get("producto"),
        cantidad=data.get("cantidad"),
        precio_unitario=data.get("precio_unitario"),
        total=data.get("total"),
        cliente=data.get("cliente"),
        observacion=data.get("observacion"),
        usuario=data.get("usuario")
    )

    db.session.add(nueva_venta)
    db.session.commit()
    db.session.refresh(nueva_venta)
    return jsonify(nueva_venta.to_dict()), 201


@ventas_bp.route("/<int:codigo>", methods=["PUT"])
def update_venta(codigo):
    venta = Venta.query.get_or_404(codigo, description="Venta no encontrada")
    data = request.get_json() or {}

    if "producto" in data:
        venta.producto = data["producto"]
    if "cantidad" in data:
        venta.cantidad = data["cantidad"]
    if "precio_unitario" in data:
        venta.precio_unitario = data["precio_unitario"]
    if "total" in data:
        venta.total = data["total"]
    if "cliente" in data:
        venta.cliente = data["cliente"]
    if "observacion" in data:
        venta.observacion = data["observacion"]
    if "usuario" in data:
        venta.usuario = data["usuario"]

    db.session.commit()
    db.session.refresh(venta)
    return jsonify(venta.to_dict()), 200


@ventas_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_venta(codigo):
    venta = Venta.query.get_or_404(codigo, description="Venta no encontrada")
    db.session.delete(venta)
    db.session.commit()
    return jsonify({"message": f"Venta con código {codigo} eliminada exitosamente"}), 200
