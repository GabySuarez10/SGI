from flask import Blueprint, jsonify, request

from queries import categoria_queries as q

categorias_bp = Blueprint("categorias", __name__, url_prefix="/api/categorias")


@categorias_bp.get("")
def listar():
    """Categorías de figuras con la cantidad de figuras de cada una."""
    return jsonify(q.listar_categorias())


@categorias_bp.post("")
def crear():
    """{ nombre }"""
    return jsonify(q.crear_categoria(request.get_json() or {}).to_dict()), 201


@categorias_bp.put("/<int:id_categoria>")
def actualizar(id_categoria):
    """{ nombre } -> renombra también en las figuras"""
    return jsonify(q.actualizar_categoria(id_categoria, request.get_json() or {}).to_dict())


@categorias_bp.delete("/<int:id_categoria>")
def eliminar(id_categoria):
    q.eliminar_categoria(id_categoria)
    return jsonify({"message": "Categoría eliminada"})
