from flask import Blueprint, jsonify, request

from queries import inventario_queries as q

inventario_local_bp = Blueprint("inventario_local", __name__, url_prefix="/api/inventario-local")


@inventario_local_bp.get("")
def listar():
    return jsonify([i.to_dict() for i in q.listar_local()])


@inventario_local_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_local(codigo).to_dict())


@inventario_local_bp.put("/<int:codigo>")
def actualizar(codigo):
    """Ajuste manual: { existencias?, precio_venta?, precio_mayorista? }"""
    return jsonify(q.actualizar_local(codigo, request.get_json() or {}).to_dict())
