from flask import Blueprint, jsonify, request

from queries import venta_queries as q

ventas_bp = Blueprint("ventas", __name__, url_prefix="/api/ventas")


@ventas_bp.get("")
def listar():
    return jsonify([v.to_dict() for v in q.listar_ventas()])


@ventas_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_venta(codigo).to_dict())


@ventas_bp.post("")
def crear():
    """{ producto: [...], cantidad: [...], precio_unitario: [...], cliente, observacion, usuario }"""
    return jsonify(q.crear_venta(request.get_json() or {}).to_dict()), 201


@ventas_bp.delete("/<int:codigo>")
def eliminar(codigo):
    """Anula la venta y devuelve las unidades al local."""
    q.eliminar_venta(codigo)
    return jsonify({"message": f"Venta {codigo} anulada"})
