"""
Ventas / salidas desde el LOCAL.

Registrar una venta:
  1. Verifica y descuenta las existencias de Inventario_local.
  2. Calcula el total = suma(cantidad[i] * precio_unitario[i]).
  3. Guarda la venta con las listas producto, cantidad y precio_unitario.
"""

from database import db
from models import Venta
from queries.comunes import (
    obtener_o_404, validar_listas_mismo_largo, validar_sin_repetidos, entero,
)
from queries.inventario_queries import fila_local
from utils.errores import ErrorAPI, NoEncontrado
from utils.fechas import a_fecha
from utils.listas import lista_textos, lista_numeros, lista_a_texto


def listar_ventas():
    return Venta.query.order_by(Venta.fecha.desc(), Venta.codigo.desc()).all()


def obtener_venta(codigo):
    return obtener_o_404(Venta, codigo, "Venta no encontrada")


def crear_venta(data):
    """
    Body:
    { "producto": ["Lapiz HB", "Borrador blanco"],
      "cantidad": [10, 4],
      "precio_unitario": [800, 700],      # opcional: si no llega, usa precio_venta del local
      "cliente": "Cliente mostrador",
      "observacion": "...", "usuario": "cajero_demo", "fecha": "2026-10-07" }
    """
    cliente = (data.get("cliente") or "").strip()
    if not cliente:
        raise ErrorAPI("Ingresa el cliente o destino de la venta")

    nombres = lista_textos(data.get("producto"))
    cantidades = lista_numeros(data.get("cantidad"))
    precios = lista_numeros(data.get("precio_unitario"))

    if not nombres:
        raise ErrorAPI("Selecciona al menos un producto")
    if not precios:
        precios = [None] * len(nombres)
    validar_listas_mismo_largo(producto=nombres, cantidad=cantidades, precio_unitario=precios)
    validar_sin_repetidos(nombres)

    nombres_guardados, precios_guardados, total = [], [], 0
    for nombre, cantidad, precio in zip(nombres, cantidades, precios):
        cantidad = entero(cantidad, f"cantidad de '{nombre}'", 1)

        local = fila_local(nombre)
        if local is None:
            raise NoEncontrado(f"'{nombre}' no está registrado en el local")
        if (local.existencias or 0) < cantidad:
            raise ErrorAPI(
                f"Stock insuficiente en el local para '{local.nombre}': "
                f"hay {local.existencias or 0}, se intentan vender {cantidad}"
            )

        if precio is None:
            precio = local.precio_venta or 0
        else:
            precio = entero(precio, "precio_unitario", 0)
        local.existencias -= cantidad
        total += cantidad * precio
        nombres_guardados.append(local.nombre)
        precios_guardados.append(precio)

    venta = Venta(
        producto=lista_a_texto(nombres_guardados),
        cantidad=lista_a_texto(cantidades),
        precio_unitario=lista_a_texto(precios_guardados),
        total=total,
        cliente=cliente,
        observacion=data.get("observacion") or "",
        usuario=data.get("usuario") or "",
    )
    fecha = a_fecha(data.get("fecha"))
    if fecha:
        venta.fecha = fecha

    db.session.add(venta)
    db.session.commit()
    db.session.refresh(venta)
    return venta


def eliminar_venta(codigo):
    """Anula una venta: devuelve las unidades al inventario del local."""
    venta = obtener_venta(codigo)
    datos = venta.to_dict()
    for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
        local = fila_local(nombre, crear=True)
        local.existencias = (local.existencias or 0) + cantidad
    db.session.delete(venta)
    db.session.commit()
