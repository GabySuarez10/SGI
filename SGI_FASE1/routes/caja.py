from flask import Blueprint, jsonify, request

from queries import caja_queries as q

caja_bp = Blueprint("caja", __name__, url_prefix="/api/caja")


@caja_bp.get("/hoy")
def hoy():
    """Caja de hoy con su resumen (o null si aún no se abre) + opciones."""
    caja = q.caja_del_dia()
    return jsonify({"caja": q.caja_con_resumen(caja) if caja else None, "opciones": q.opciones_caja()})


@caja_bp.get("")
def listar():
    """Historial de cierres."""
    return jsonify([c.to_dict() for c in q.listar_cajas()])


@caja_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.caja_con_resumen(q.obtener_caja(codigo)))


@caja_bp.post("/abrir")
def abrir():
    """{ base, usuario }"""
    return jsonify(q.caja_con_resumen(q.abrir_caja(request.get_json() or {}))), 201


@caja_bp.post("/<int:codigo>/movimientos")
def agregar_movimiento(codigo):
    """{ tipo: 'entrada'|'salida', valor, motivo, categoria, usuario }"""
    q.agregar_movimiento(codigo, request.get_json() or {})
    return jsonify(q.caja_con_resumen(q.obtener_caja(codigo))), 201


@caja_bp.delete("/movimientos/<int:codigo>")
def eliminar_movimiento(codigo):
    q.eliminar_movimiento(codigo)
    return jsonify({"message": "Movimiento eliminado"})


@caja_bp.post("/<int:codigo>/cerrar")
def cerrar(codigo):
    """{ conteo: {"50000": 3, ...} } o { efectivo_contado: 245000 }, observaciones, usuario"""
    return jsonify(q.caja_con_resumen(q.cerrar_caja(codigo, request.get_json() or {})))


@caja_bp.post("/<int:codigo>/reabrir")
def reabrir(codigo):
    """{ motivo }"""
    return jsonify(q.caja_con_resumen(q.reabrir_caja(codigo, request.get_json() or {})))
