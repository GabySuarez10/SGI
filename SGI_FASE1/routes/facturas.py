from flask import Blueprint, jsonify, request

from queries import factura_queries as q

facturas_bp = Blueprint("facturas", __name__, url_prefix="/api/facturas")


@facturas_bp.get("")
def listar():
    """?tipo=pos|electronica  ?estado=pendiente_envio|aceptada|rechazada|anulada"""
    tipo = request.args.get("tipo") or None
    estado = request.args.get("estado") or None
    return jsonify([f.to_dict() for f in q.listar_facturas(tipo, estado)])


@facturas_bp.get("/<int:codigo>")
def obtener(codigo):
    return jsonify(q.obtener_factura(codigo).to_dict())


@facturas_bp.post("")
def crear():
    """{ venta, tipo: 'pos'|'electronica', cliente{...}, forma_pago, medio_pago, recibido }"""
    return jsonify(q.crear_factura(request.get_json() or {}).to_dict()), 201


@facturas_bp.get("/venta/<int:venta>")
def de_venta(venta):
    return jsonify([f.to_dict() for f in q.facturas_de_venta(venta)])


@facturas_bp.get("/ventas-sin-factura")
def ventas_sin_factura():
    return jsonify([v.to_dict() for v in q.ventas_sin_factura()])


@facturas_bp.put("/<int:codigo>/dian")
def registrar_validacion(codigo):
    """{ cufe, estado: 'aceptada' | 'rechazada' | 'pendiente_envio' }"""
    return jsonify(q.registrar_validacion(codigo, request.get_json() or {}).to_dict())


@facturas_bp.post("/<int:codigo>/anular")
def anular(codigo):
    """{ motivo }"""
    return jsonify(q.anular_factura(codigo, request.get_json() or {}).to_dict())


@facturas_bp.get("/datos")
def datos():
    """Datos del negocio para facturar + opciones (tipos de documento, medios de pago...)."""
    return jsonify({"datos": q.datos_facturacion(), "opciones": q.opciones_facturacion()})


@facturas_bp.put("/datos")
def guardar_datos():
    return jsonify({"datos": q.guardar_datos_facturacion(request.get_json() or {}),
                    "opciones": q.opciones_facturacion()})
