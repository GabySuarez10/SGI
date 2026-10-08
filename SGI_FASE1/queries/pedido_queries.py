"""
Pedidos a proveedores.

Flujo:
  1. crear_pedido      -> el pedido queda PENDIENTE (estado = False).
                          llegan/sobran/dañados en 0 y faltan = cantidad pedida.
  2. registrar_recepcion -> se compara la FACTURA del proveedor (unidades y
                          precio facturados) con lo que llegó y lo dañado; se
                          calculan sobran y faltan, el pedido pasa a RECIBIDO
                          (estado = True) y las unidades en buen estado
                          (llegan - dañados) se suman al inventario de destino:
                          zona_entrega = True -> Bodega, False -> Local.
  3. cambiar_destino    -> cambia Bodega <-> Local. Si el pedido ya se recibió,
                          mueve también las unidades de un inventario al otro.
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


def limite_del_proveedor(pedido):
    """Precio máximo por figura pactado con el proveedor del pedido (o None)."""
    proveedor = db.session.get(Proveedor, pedido.proveedor) if pedido.proveedor else None
    return proveedor.limite_precio if proveedor else None


def pedido_con_limite(pedido):
    datos = pedido.to_dict()
    datos["limite_precio"] = limite_del_proveedor(pedido)
    return datos


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
    pedido.facturado = lista_a_texto(ceros)
    pedido.precio_factura = lista_a_texto(ceros)
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


def _sumar_al_destino(nombre, unidades, en_bodega):
    """Suma (o resta si unidades < 0) al inventario de bodega o del local."""
    fila = fila_bodega(nombre, crear=True) if en_bodega else fila_local(nombre, crear=True)
    nuevo = (fila.existencias or 0) + unidades
    if nuevo < 0:
        lugar = "la bodega" if en_bodega else "el local"
        raise ErrorAPI(
            f"No hay suficientes unidades de '{nombre}' en {lugar} para moverlas "
            f"(hay {fila.existencias or 0}, se necesitan {-unidades})",
            409,
        )
    fila.existencias = nuevo


def registrar_recepcion(codigo, data):
    """
    Body (listas en el mismo orden que "productos" del pedido):
    { "llegan": [20, 18],             unidades que llegaron (incluye dañadas)
      "danados": [0, 1],              unidades dañadas
      "facturado": [20, 20],          unidades que dice la factura   (opcional)
      "precio_factura": [3100, 3200], precio unitario de la factura  (opcional)
      "observaciones": "...",         (opcional)
      "fecha_llegada": "..." }        (opcional)
    """
    pedido = obtener_pedido(codigo)
    if pedido.estado:
        raise ErrorAPI("Este pedido ya fue recibido", 409)

    datos = pedido.to_dict()
    nombres, solicitadas = datos["productos"], datos["cantidad"]
    llegan = lista_numeros(data.get("llegan"))
    danados = lista_numeros(data.get("danados")) or [0] * len(nombres)
    facturado = lista_numeros(data.get("facturado")) or list(solicitadas)
    precio_factura = lista_numeros(data.get("precio_factura")) or list(datos["precio_esperado"])
    validar_listas_mismo_largo(
        productos=nombres, llegan=llegan, danados=danados,
        facturado=facturado, precio_factura=precio_factura,
    )

    sobran, faltan = [], []
    for nombre, pedida, llego, danado, fact, precio in zip(
        nombres, solicitadas, llegan, danados, facturado, precio_factura
    ):
        llego = entero(llego, f"recibido de '{nombre}'", 0)
        danado = entero(danado, f"dañado de '{nombre}'", 0)
        entero(fact, f"facturado de '{nombre}'", 0)
        entero(precio, f"precio de factura de '{nombre}'", 0)
        if danado > llego:
            raise ErrorAPI(f"'{nombre}': las unidades dañadas no pueden superar las recibidas")
        sobran.append(max(llego - pedida, 0))
        faltan.append(max(pedida - llego, 0))

        utilizables = llego - danado
        if utilizables > 0:
            _sumar_al_destino(nombre, utilizables, pedido.zona_entrega)

    pedido.llegan = lista_a_texto(llegan)
    pedido.danados = lista_a_texto(danados)
    pedido.sobran = lista_a_texto(sobran)
    pedido.faltan = lista_a_texto(faltan)
    pedido.facturado = lista_a_texto(facturado)
    pedido.precio_factura = lista_a_texto(precio_factura)
    pedido.observaciones = (data.get("observaciones") or "").strip()
    pedido.estado = True
    pedido.fecha_llegada = a_fecha(data.get("fecha_llegada"), "fecha_llegada") or datetime.now().replace(microsecond=0)

    db.session.commit()
    db.session.refresh(pedido)
    return pedido


def cambiar_destino(codigo, data):
    """
    Body: { "zona_entrega": true }   true = Bodega, false = Local

    Pendiente: solo cambia el destino.
    Recibido:  además mueve las unidades en buen estado (llegan - dañados)
               del inventario anterior al nuevo.
    """
    pedido = obtener_pedido(codigo)
    if "zona_entrega" not in data:
        raise ErrorAPI("Indica el nuevo destino (zona_entrega)")
    nuevo = _a_booleano(data.get("zona_entrega"))
    if nuevo == bool(pedido.zona_entrega):
        return pedido

    if pedido.estado:
        datos = pedido.to_dict()
        for nombre, llego, danado in zip(datos["productos"], datos["llegan"], datos["danados"]):
            utilizables = max(llego - danado, 0)
            if utilizables:
                _sumar_al_destino(nombre, -utilizables, bool(pedido.zona_entrega))
                _sumar_al_destino(nombre, utilizables, nuevo)

    pedido.zona_entrega = nuevo
    db.session.commit()
    db.session.refresh(pedido)
    return pedido


def eliminar_pedido(codigo):
    pedido = obtener_pedido(codigo)
    if pedido.estado:
        raise ErrorAPI(
            "No se puede eliminar un pedido que ya fue recibido: sus unidades ya entraron al inventario",
            409,
        )
    db.session.delete(pedido)
    db.session.commit()
