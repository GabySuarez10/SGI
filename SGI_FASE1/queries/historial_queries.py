"""
Historial de movimientos y resumen para el inicio (dashboard).

Cada venta, traslado o pedido guarda VARIOS productos en listas; aquí se
"despliega" cada fila en un movimiento por producto para mostrarlos en tabla.
"""

from database import db
from models import (
    Venta, Traslado, PedidoProveedor, Producto, InventarioBodega, InventarioLocal, Proveedor,
)

STOCK_BAJO = 5


def _destino_pedido(pedido):
    return "Bodega" if pedido.zona_entrega else "Local"


def listar_movimientos(limite=None):
    movimientos = []

    for venta in Venta.query.all():
        datos = venta.to_dict()
        for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
            movimientos.append({
                "tipo": "Venta / Salida",
                "codigo": f"V{venta.codigo:04d}",
                "producto": nombre,
                "cantidad": cantidad,
                "origen": "Local",
                "destino": venta.cliente or "Cliente",
                "fecha": datos["fecha"],
                "estado": venta.modalidad or "Completado",
            })

    for traslado in Traslado.query.all():
        datos = traslado.to_dict()
        for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
            movimientos.append({
                "tipo": "Traslado",
                "codigo": f"T{traslado.codigo:04d}",
                "producto": nombre,
                "cantidad": cantidad,
                "origen": "Local" if traslado.sentido == "local_bodega" else "Bodega",
                "destino": "Bodega" if traslado.sentido == "local_bodega" else "Local",
                "fecha": datos["fecha"],
                "estado": "Completado",
            })

    for pedido in PedidoProveedor.query.all():
        datos = pedido.to_dict()
        # Si ya llegó se muestran las unidades recibidas; si no, las pedidas
        cantidades = datos["llegan"] if pedido.estado else datos["cantidad"]
        fecha = datos["fecha_llegada"] if pedido.estado and datos["fecha_llegada"] else datos["fecha_pedido"]
        for nombre, cantidad in zip(datos["productos"], cantidades):
            movimientos.append({
                "tipo": "Pedido a proveedor",
                "codigo": f"PP{pedido.codigo:04d}",
                "producto": nombre,
                "cantidad": cantidad,
                "origen": pedido.proveedor,
                "destino": _destino_pedido(pedido),
                "fecha": fecha,
                "estado": "Recibido" if pedido.estado else "Pendiente",
            })

    # Categoría y tipo de cada producto (por nombre) para poder filtrar el historial
    datos_producto = {
        (nombre or "").strip().lower(): (categoria or "", tipo or "figura")
        for nombre, categoria, tipo in db.session.query(Producto.nombre, Producto.categoria, Producto.tipo)
    }
    for movimiento in movimientos:
        categoria, tipo = datos_producto.get(movimiento["producto"].strip().lower(), ("", "figura"))
        movimiento["categoria"] = categoria
        movimiento["tipo_producto"] = tipo

    movimientos.sort(key=lambda m: m["fecha"] or "", reverse=True)
    return movimientos[:limite] if limite else movimientos


def resumen_dashboard():
    """Datos de las tarjetas, pedidos, alertas y actividad de la página de inicio."""
    unidades_bodega = db.session.query(
        db.func.coalesce(db.func.sum(InventarioBodega.existencias), 0)
    ).scalar()
    unidades_local = db.session.query(
        db.func.coalesce(db.func.sum(InventarioLocal.existencias), 0)
    ).scalar()
    stock_bajo_local = InventarioLocal.query.filter(InventarioLocal.existencias <= STOCK_BAJO).count()
    stock_bajo_bodega = InventarioBodega.query.filter(InventarioBodega.existencias <= STOCK_BAJO).count()

    pedidos = PedidoProveedor.query.order_by(
        PedidoProveedor.estado.asc(),            # primero los pendientes
        PedidoProveedor.fecha_pedido.desc(),
    ).limit(5).all()

    # Alertas a partir del último pedido recibido
    alertas = []
    ultimo = PedidoProveedor.query.filter(PedidoProveedor.estado.is_(True)).order_by(
        PedidoProveedor.fecha_llegada.desc().nulls_last(), PedidoProveedor.codigo.desc()
    ).first()
    if ultimo:
        datos = ultimo.to_dict()
        faltan, danados = sum(datos["faltan"]), sum(datos["danados"])
        if faltan:
            alertas.append({
                "nivel": "warning",
                "titulo": "Productos faltantes",
                "mensaje": f"{faltan} unidad(es) no llegaron en el pedido #{ultimo.codigo:03d} de {ultimo.proveedor}.",
            })
        if danados:
            alertas.append({
                "nivel": "danger",
                "titulo": "Productos dañados",
                "mensaje": f"{danados} unidad(es) llegaron dañadas en el pedido #{ultimo.codigo:03d}.",
            })

        # Comparativa con la factura del proveedor
        proveedor = db.session.get(Proveedor, ultimo.proveedor) if ultimo.proveedor else None
        limite = proveedor.limite_precio if proveedor else None
        sobre_limite = [
            nombre for nombre, precio in zip(datos["productos"], datos["precio_factura"])
            if limite and precio > limite
        ]
        diferencias = sum(
            1 for fact, llego in zip(datos["facturado"], datos["llegan"]) if fact and fact != llego
        )
        if sobre_limite:
            alertas.append({
                "nivel": "danger",
                "titulo": "Precio por encima del límite",
                "mensaje": (
                    f"{len(sobre_limite)} producto(s) del pedido #{ultimo.codigo:03d} se facturaron por "
                    f"encima de ${f'{limite:,}'.replace(',', '.')} pactados con {ultimo.proveedor}."
                ),
            })
        if diferencias:
            alertas.append({
                "nivel": "warning",
                "titulo": "Factura no coincide",
                "mensaje": f"En {diferencias} producto(s) del pedido #{ultimo.codigo:03d} lo facturado no coincide con lo recibido.",
            })
    if stock_bajo_local:
        alertas.append({
            "nivel": "warning",
            "titulo": "Stock bajo en el local",
            "mensaje": f"{stock_bajo_local} producto(s) tienen {STOCK_BAJO} unidades o menos en el local.",
        })
    if stock_bajo_bodega:
        alertas.append({
            "nivel": "danger",
            "titulo": "Stock bajo en bodega",
            "mensaje": f"{stock_bajo_bodega} producto(s) tienen {STOCK_BAJO} unidades o menos en bodega.",
        })

    return {
        "total_productos": Producto.query.count(),
        "unidades_bodega": int(unidades_bodega or 0),
        "unidades_local": int(unidades_local or 0),
        "pedidos_pendientes": PedidoProveedor.query.filter(PedidoProveedor.estado.is_(False)).count(),
        "pedidos_recientes": [p.to_dict() for p in pedidos],
        "alertas": alertas,
        "actividad_reciente": listar_movimientos(limite=5),
    }
