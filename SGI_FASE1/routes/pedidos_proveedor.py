from flask import Blueprint, jsonify, request

from queries import pedido_queries as q

pedidos_proveedor_bp = Blueprint("pedidos_proveedor", __name__, url_prefix="/api/pedidos-proveedor")


@pedidos_proveedor_bp.get("")
def listar():
    """?estado=pendientes | recibidos (opcional)"""
    filtro = (request.args.get("estado") or "").lower()
    estado = {"pendientes": False, "recibidos": True}.get(filtro)
    return jsonify([p.to_dict() for p in q.listar_pedidos(estado)])


@pedidos_proveedor_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_pedido(codigo).to_dict())


@pedidos_proveedor_bp.post("")
def crear():
    """{ proveedor, productos: [...], cantidad: [...], precio_esperado: [...], fecha_pedido, zona_entrega }"""
    return jsonify(q.crear_pedido(request.get_json() or {}).to_dict()), 201


@pedidos_proveedor_bp.put("/<int:codigo>")
def actualizar(codigo):
    """Edita un pedido pendiente."""
    return jsonify(q.actualizar_pedido(codigo, request.get_json() or {}).to_dict())


@pedidos_proveedor_bp.put("/<int:codigo>/recepcion")
def recepcion(codigo):
    """{ llegan: [...], danados: [...] } -> marca recibido y suma el stock"""
    return jsonify(q.registrar_recepcion(codigo, request.get_json() or {}).to_dict())


@pedidos_proveedor_bp.delete("/<int:codigo>")
def eliminar(codigo):
    q.eliminar_pedido(codigo)
    return jsonify({"message": f"Pedido {codigo} eliminado"})
