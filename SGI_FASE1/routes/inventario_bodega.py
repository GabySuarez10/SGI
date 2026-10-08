from flask import Blueprint, jsonify, request

from queries import inventario_queries as q

inventario_bodega_bp = Blueprint("inventario_bodega", __name__, url_prefix="/api/inventario-bodega")


@inventario_bodega_bp.get("")
def listar():
    """Incluye tipo (figura, pintura, pincel, otro), colección y referencia."""
    return jsonify(q.con_tipo(q.listar_bodega()))


@inventario_bodega_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_bodega(codigo).to_dict())


@inventario_bodega_bp.put("/<int:codigo>")
def actualizar(codigo):
    """Ajuste manual: { existencias?, costo? }"""
    return jsonify(q.actualizar_bodega(codigo, request.get_json() or {}).to_dict())
