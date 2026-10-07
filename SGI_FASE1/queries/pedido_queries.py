"""
Pedidos a proveedores.

Flujo:
  1. crear_pedido      -> el pedido queda PENDIENTE (estado = False).
                          llegan/sobran/dañados en 0 y faltan = cantidad pedida.
  2. registrar_recepcion -> se indica cuántas unidades llegaron y cuántas
                          dañadas; se calculan sobran y faltan, el pedido pasa a
                          RECIBIDO (estado = True) y las unidades en buen estado
                          (llegan - dañados) se suman al inventario de destino:
                          zona_entrega = True -> Bodega, False -> Local.
"""

from datetime import datetime

from database import db
from models import PedidoProveedor, Proveedor, Producto
from queries.comunes import (
    obtener_o_404, buscar_por_nombre, validar_listas_mismo_largo,
    validar_sin_repetidos, entero,
)
from queries.inventario_queries import fila_bodega, fila_local
from utils.errores import ErrorAPI, NoEncontrado
from utils.fechas import a_fecha
from utils.listas import lista_textos, lista_numeros, lista_a_texto


def listar_pedidos(estado=None):
    consulta = PedidoProveedor.query
    if estado is not None:
        consulta = consulta.filter(PedidoProveedor.estado == estado)
    return consulta.order_by(PedidoProveedor.fecha_pedido.desc(), PedidoProveedor.codigo.desc()).all()


def obtener_pedido(codigo):
    return obtener_o_404(PedidoProveedor, codigo, f"Pedido #{codigo} no encontrado")


def _a_booleano(valor, por_defecto=True):
    if valor is None:
        return por_defecto
    if isinstance(valor, str):
        return valor.strip().lower() in ("true", "1", "si", "sí", "bodega")
    return bool(valor)


def _leer_productos(data, proveedor):
    """Valida productos, cantidades y precios esperados de un pedido."""
    nombres = lista_textos(data.get("productos"))
    cantidades = lista_numeros(data.get("cantidad"))
    precios = lista_numeros(data.get("precio_esperado"))

    if not nombres:
        raise ErrorAPI("Agrega al menos un producto al pedido")
    if not precios:
        precios = [None] * len(nombres)
    validar_listas_mismo_largo(productos=nombres, cantidad=cantidades, precio_esperado=precios)
    validar_sin_repetidos(nombres)

    nombres_ok, cantidades_ok, precios_ok = [], [], []
    for nombre, cantidad, precio in zip(nombres, cantidades, precios):
        producto = buscar_por_nombre(Producto, nombre)
        if producto is None:
            raise NoEncontrado(f"El producto '{nombre}' no existe en el catálogo")
        if producto.proveedor != proveedor:
            raise ErrorAPI(
                f"'{producto.nombre}' pertenece a '{producto.proveedor}', no a '{proveedor}'"
            )
        nombres_ok.append(producto.nombre)
        cantidades_ok.append(entero(cantidad, f"cantidad de '{nombre}'", 1))
        if precio is None:
            precios_ok.append(producto.costo or 0)
        else:
            precios_ok.append(entero(precio, "precio_esperado", 0))

    return nombres_ok, cantidades_ok, precios_ok


def _asignar_productos(pedido, nombres, cantidades, precios):
    ceros = [0] * len(nombres)
    pedido.productos = lista_a_texto(nombres)
    pedido.cantidad = lista_a_texto(cantidades)
    pedido.precio_esperado = lista_a_texto(precios)
    pedido.llegan = lista_a_texto(ceros)
    pedido.sobran = lista_a_texto(ceros)
    pedido.faltan = lista_a_texto(cantidades)
    pedido.danados = lista_a_texto(ceros)
    pedido.precio_total = sum(c * p for c, p in zip(cantidades, precios))


def crear_pedido(data):
    """
    Body:
    { "proveedor": "Arte y Color",
      "productos": ["Colores x12", "Block iris"],
      "cantidad": [20, 10],
      "precio_esperado": [7000, 4800],   # opcional: si no llega, usa el costo del producto
      "fecha_pedido": "2026-10-07",
      "zona_entrega": true }             # true = Bodega, false = Local
    """
    proveedor = (data.get("proveedor") or "").strip()
    if not proveedor:
        raise ErrorAPI("Selecciona un proveedor")
    if db.session.get(Proveedor, proveedor) is None:
        raise NoEncontrado(f"El proveedor '{proveedor}' no existe")

    nombres, cantidades, precios = _leer_productos(data, proveedor)

    pedido = PedidoProveedor(
        proveedor=proveedor,
        estado=False,
        zona_entrega=_a_booleano(data.get("zona_entrega")),
    )
    _asignar_productos(pedido, nombres, cantidades, precios)
    fecha = a_fecha(data.get("fecha_pedido"), "fecha_pedido")
    if fecha:
        pedido.fecha_pedido = fecha

    db.session.add(pedido)
    db.session.commit()
    db.session.refresh(pedido)
    return pedido


def actualizar_pedido(codigo, data):
    """Edita un pedido que aún está pendiente."""
    pedido = obtener_pedido(codigo)
    if pedido.estado:
        raise ErrorAPI("El pedido ya fue recibido y no se puede modificar", 409)

    if any(campo in data for campo in ("productos", "cantidad", "precio_esperado")):
        actual = pedido.to_dict()
        combinado = {
            "productos": data.get("productos", actual["productos"]),
            "cantidad": data.get("cantidad", actual["cantidad"]),
            "precio_esperado": data.get("precio_esperado", actual["precio_esperado"]),
        }
        _asignar_productos(pedido, *_leer_productos(combinado, pedido.proveedor))

    if "zona_entrega" in data:
        pedido.zona_entrega = _a_booleano(data["zona_entrega"])
    if data.get("fecha_pedido"):
        pedido.fecha_pedido = a_fecha(data["fecha_pedido"], "fecha_pedido")

    db.session.commit()
    db.session.refresh(pedido)
    return pedido


def registrar_recepcion(codigo, data):
    """
    Body: { "llegan": [20, 18], "danados": [0, 1], "fecha_llegada": "..." (opcional) }
    Las listas siguen el mismo orden que "productos" del pedido.
    """
    pedido = obtener_pedido(codigo)
    if pedido.estado:
        raise ErrorAPI("Este pedido ya fue recibido", 409)

    datos = pedido.to_dict()
    nombres, solicitadas = datos["productos"], datos["cantidad"]
    llegan = lista_numeros(data.get("llegan"))
    danados = lista_numeros(data.get("danados")) or [0] * len(nombres)
    validar_listas_mismo_largo(productos=nombres, llegan=llegan, danados=danados)

    sobran, faltan = [], []
    for nombre, pedida, llego, danado in zip(nombres, solicitadas, llegan, danados):
        llego = entero(llego, f"recibido de '{nombre}'", 0)
        danado = entero(danado, f"dañado de '{nombre}'", 0)
        if danado > llego:
            raise ErrorAPI(f"'{nombre}': las unidades dañadas no pueden superar las recibidas")
        sobran.append(max(llego - pedida, 0))
        faltan.append(max(pedida - llego, 0))

        utilizables = llego - danado
        if utilizables > 0:
            if pedido.zona_entrega:
                fila = fila_bodega(nombre, crear=True)
            else:
                fila = fila_local(nombre, crear=True)
            fila.existencias = (fila.existencias or 0) + utilizables

    pedido.llegan = lista_a_texto(llegan)
    pedido.danados = lista_a_texto(danados)
    pedido.sobran = lista_a_texto(sobran)
    pedido.faltan = lista_a_texto(faltan)
    pedido.estado = True
    pedido.fecha_llegada = a_fecha(data.get("fecha_llegada"), "fecha_llegada") or datetime.now().replace(microsecond=0)

    db.session.commit()
    db.session.refresh(pedido)
    return pedido


def eliminar_pedido(codigo):
    pedido = obtener_pedido(codigo)
    if pedido.estado:
        raise ErrorAPI("No se puede eliminar un pedido que ya fue recibido", 409)
    db.session.delete(pedido)
    db.session.commit()
