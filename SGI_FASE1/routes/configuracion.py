from flask import Blueprint, jsonify, request

from queries import configuracion_queries as q
from utils.precios import MODALIDADES

configuracion_bp = Blueprint("configuracion", __name__, url_prefix="/api/configuracion")


@configuracion_bp.get("")
def obtener():
    """Valores generales, su descripción, las tarifas de envío y las modalidades de venta."""
    return jsonify({
        "valores": q.valores(),
        "detalle": [c.to_dict() for c in q.listar_configuracion()],
        "tarifas_envio": [t.to_dict() for t in q.listar_tarifas()],
        "modalidades_venta": list(MODALIDADES),
    })


@configuracion_bp.put("")
def actualizar():
    """{ "precio_kit_contrato": 14000, ... }"""
    return jsonify(q.actualizar_configuracion(request.get_json() or {}))


@configuracion_bp.get("/tarifas-envio")
def tarifas():
    return jsonify([t.to_dict() for t in q.listar_tarifas()])


@configuracion_bp.put("/tarifas-envio")
def guardar_tarifas():
    """[ {id?, nombre, precio}, ... ] reemplaza toda la tabla"""
    return jsonify([t.to_dict() for t in q.guardar_tarifas(request.get_json() or [])])
