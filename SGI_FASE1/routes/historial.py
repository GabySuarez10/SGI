from flask import Blueprint, jsonify, request

from queries import historial_queries as q

historial_bp = Blueprint("historial", __name__, url_prefix="/api")


@historial_bp.get("/historial")
def movimientos():
    """Ventas, traslados y pedidos desplegados en un movimiento por producto."""
    limite = request.args.get("limite", type=int)
    return jsonify(q.listar_movimientos(limite))


@historial_bp.get("/dashboard")
def dashboard():
    """Resumen para la página de inicio."""
    return jsonify(q.resumen_dashboard())
