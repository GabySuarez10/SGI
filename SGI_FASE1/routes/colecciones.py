from flask import Blueprint, jsonify, request

from queries import coleccion_queries as q

colecciones_bp = Blueprint("colecciones", __name__, url_prefix="/api/colecciones")


@colecciones_bp.get("")
def listar():
    """Colecciones de pinturas con la cantidad de tonos de cada una."""
    return jsonify(q.listar_colecciones())


@colecciones_bp.post("")
def crear():
    """{ nombre, descripcion? }"""
    return jsonify(q.crear_coleccion(request.get_json() or {}).to_dict()), 201


@colecciones_bp.put("/<int:id_coleccion>")
def actualizar(id_coleccion):
    return jsonify(q.actualizar_coleccion(id_coleccion, request.get_json() or {}).to_dict())


@colecciones_bp.delete("/<int:id_coleccion>")
def eliminar(id_coleccion):
    q.eliminar_coleccion(id_coleccion)
    return jsonify({"message": "Colección eliminada"})
