from flask import Blueprint, jsonify, request

from queries import proveedor_queries as q

proveedores_bp = Blueprint("proveedores", __name__, url_prefix="/api/proveedores")


@proveedores_bp.get("")
def listar():
    return jsonify([p.to_dict() for p in q.listar_proveedores()])


@proveedores_bp.get("/<string:nombre>")
def obtener(nombre):
    return jsonify(q.obtener_proveedor(nombre).to_dict())


@proveedores_bp.post("")
def crear():
    """{ nombre, telefono, direccion, ciudad, descripcion }"""
    return jsonify(q.crear_proveedor(request.get_json() or {}).to_dict()), 201


@proveedores_bp.put("/<string:nombre>")
def actualizar(nombre):
    """Permite cambiar también el nombre (se actualiza en productos y pedidos)."""
    return jsonify(q.actualizar_proveedor(nombre, request.get_json() or {}).to_dict())


@proveedores_bp.delete("/<string:nombre>")
def eliminar(nombre):
    q.eliminar_proveedor(nombre)
    return jsonify({"message": f"Proveedor '{nombre}' eliminado"})
