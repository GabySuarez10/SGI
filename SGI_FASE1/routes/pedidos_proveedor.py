from datetime import datetime
from flask import Blueprint, jsonify, request
from database import db
from models import PedidoProveedor

pedidos_proveedor_bp = Blueprint("pedidos_proveedor", __name__, url_prefix="/api/pedidos-proveedor")


@pedidos_proveedor_bp.route("", methods=["GET"])
def get_pedidos():
    pedidos = PedidoProveedor.query.all()
    return jsonify([p.to_dict() for p in pedidos]), 200


@pedidos_proveedor_bp.route("/<int:codigo>", methods=["GET"])
def get_pedido(codigo):
    pedido = PedidoProveedor.query.get_or_404(codigo, description="Pedido no encontrado")
    return jsonify(pedido.to_dict()), 200


@pedidos_proveedor_bp.route("", methods=["POST"])
def create_pedido():
    data = request.get_json() or {}

    fecha_llegada_val = None
    if data.get("fecha_llegada"):
        try:
            fecha_llegada_val = datetime.fromisoformat(data.get("fecha_llegada"))
        except ValueError:
            return jsonify({"error": "Formato de fecha_llegada inválido. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400

    nuevo_pedido = PedidoProveedor(
        proveedor=data.get("proveedor"),
        productos=data.get("productos"),
        cantidad=data.get("cantidad"),
        precio_esperado=data.get("precio_esperado"),
        llegan=data.get("llegan"),
        sobran=data.get("sobran"),
        faltan=data.get("faltan"),
        danados=data.get("danados"),
        precio_total=data.get("precio_total"),
        fecha_llegada=fecha_llegada_val,
        estado=data.get("estado", False),
        zona_entrega=data.get("zona_entrega", False)
    )

    db.session.add(nuevo_pedido)
    db.session.commit()
    db.session.refresh(nuevo_pedido)
    return jsonify(nuevo_pedido.to_dict()), 201


@pedidos_proveedor_bp.route("/<int:codigo>", methods=["PUT"])
def update_pedido(codigo):
    pedido = PedidoProveedor.query.get_or_404(codigo, description="Pedido no encontrado")
    data = request.get_json() or {}

    if "proveedor" in data:
        pedido.proveedor = data["proveedor"]
    if "productos" in data:
        pedido.productos = data["productos"]
    if "cantidad" in data:
        pedido.cantidad = data["cantidad"]
    if "precio_esperado" in data:
        pedido.precio_esperado = data["precio_esperado"]
    if "llegan" in data:
        pedido.llegan = data["llegan"]
    if "sobran" in data:
        pedido.sobran = data["sobran"]
    if "faltan" in data:
        pedido.faltan = data["faltan"]
    if "danados" in data:
        pedido.danados = data["danados"]
    if "precio_total" in data:
        pedido.precio_total = data["precio_total"]
    if "estado" in data:
        pedido.estado = data["estado"]
    if "zona_entrega" in data:
        pedido.zona_entrega = data["zona_entrega"]
    if "fecha_llegada" in data:
        if data["fecha_llegada"] is None:
            pedido.fecha_llegada = None
        else:
            try:
                pedido.fecha_llegada = datetime.fromisoformat(data["fecha_llegada"])
            except ValueError:
                return jsonify({"error": "Formato de fecha_llegada inválido"}), 400

    db.session.commit()
    db.session.refresh(pedido)
    return jsonify(pedido.to_dict()), 200


@pedidos_proveedor_bp.route("/<int:codigo>", methods=["DELETE"])
def delete_pedido(codigo):
    pedido = PedidoProveedor.query.get_or_404(codigo, description="Pedido no encontrado")
    db.session.delete(pedido)
    db.session.commit()
    return jsonify({"message": f"Pedido con código {codigo} eliminado exitosamente"}), 200
