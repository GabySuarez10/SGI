from flask import Blueprint, jsonify, request

from queries import producto_queries as q

productos_bp = Blueprint("productos", __name__, url_prefix="/api/productos")


@productos_bp.get("")
def listar():
    """Catálogo con existencias de bodega, local y precios de venta."""
    return jsonify(q.listar_productos())


@productos_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_producto_detallado(codigo))


@productos_bp.post("")
def crear():
    """
    Uno o varios productos del mismo proveedor:
    { proveedor, productos: [ {nombre, tamano, descripcion, imagen, ...} ] }
    """
    creados = q.crear_productos(request.get_json() or {})
    return jsonify([p.to_dict() for p in creados]), 201


@productos_bp.put("/<int:codigo>")
def actualizar(codigo):
    producto = q.actualizar_producto(codigo, request.get_json() or {})
    return jsonify(q.obtener_producto_detallado(producto.codigo))


@productos_bp.delete("/<int:codigo>")
def eliminar(codigo):
    q.eliminar_producto(codigo)
    return jsonify({"message": f"Producto {codigo} eliminado"})
