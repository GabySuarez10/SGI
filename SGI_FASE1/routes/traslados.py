from flask import Blueprint, jsonify, request

from queries import traslado_queries as q

traslados_bp = Blueprint("traslados", __name__, url_prefix="/api/traslados")


@traslados_bp.get("")
def listar():
    return jsonify([t.to_dict() for t in q.listar_traslados()])


@traslados_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_traslado(codigo).to_dict())


@traslados_bp.post("")
def crear():
    """{ producto: [nombres], cantidad: [unidades] } -> mueve stock de bodega al local"""
    return jsonify(q.crear_traslado(request.get_json() or {}).to_dict()), 201


@traslados_bp.delete("/<int:codigo>")
def eliminar(codigo):
    """Anula el traslado y devuelve las unidades a la bodega."""
    q.eliminar_traslado(codigo)
    return jsonify({"message": f"Traslado {codigo} anulado"})
