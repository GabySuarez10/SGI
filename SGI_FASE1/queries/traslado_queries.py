"""
Traslados de BODEGA -> LOCAL.

Registrar un traslado:
  1. Descuenta las unidades de Inventario_bodega.
  2. Suma las unidades a Inventario_local.
  3. Guarda la fila en Traslado con las listas de productos y cantidades.
Todo ocurre en una sola transacción: si un producto falla, no se guarda nada.
"""

from database import db
from models import Traslado
from queries.comunes import (
    obtener_o_404, validar_listas_mismo_largo, validar_sin_repetidos, entero,
)
from queries.inventario_queries import fila_bodega, fila_local
from utils.errores import ErrorAPI, NoEncontrado
from utils.fechas import a_fecha
from utils.listas import lista_textos, lista_numeros, lista_a_texto


def listar_traslados():
    return Traslado.query.order_by(Traslado.fecha.desc(), Traslado.codigo.desc()).all()


def obtener_traslado(codigo):
    return obtener_o_404(Traslado, codigo, "Traslado no encontrado")


def crear_traslado(data):
    """
    Body: { "producto": ["Lapiz HB", "Borrador blanco"], "cantidad": [10, 5],
            "fecha": "2026-10-07" (opcional) }
    También acepta texto: "producto": "Lapiz HB, Borrador blanco".
    """
    nombres = lista_textos(data.get("producto"))
    cantidades = lista_numeros(data.get("cantidad"))

    if not nombres:
        raise ErrorAPI("Selecciona al menos un producto para trasladar")
    validar_listas_mismo_largo(producto=nombres, cantidad=cantidades)
    validar_sin_repetidos(nombres)

    nombres_guardados = []
    for nombre, cantidad in zip(nombres, cantidades):
        cantidad = entero(cantidad, f"cantidad de '{nombre}'", 1)

        bodega = fila_bodega(nombre)
        if bodega is None:
            raise NoEncontrado(f"'{nombre}' no está registrado en la bodega")
        if (bodega.existencias or 0) < cantidad:
            raise ErrorAPI(
                f"Stock insuficiente en bodega para '{bodega.nombre}': "
                f"hay {bodega.existencias or 0}, se intentan trasladar {cantidad}"
            )

        local = fila_local(bodega.nombre, crear=True, codigo=bodega.codigo)
        bodega.existencias = (bodega.existencias or 0) - cantidad
        local.existencias = (local.existencias or 0) + cantidad
        nombres_guardados.append(bodega.nombre)

    traslado = Traslado(
        producto=lista_a_texto(nombres_guardados),
        cantidad=lista_a_texto(cantidades),
    )
    fecha = a_fecha(data.get("fecha"))
    if fecha:
        traslado.fecha = fecha

    db.session.add(traslado)
    db.session.commit()
    db.session.refresh(traslado)
    return traslado


def eliminar_traslado(codigo):
    """Anula un traslado: devuelve las unidades del local a la bodega."""
    traslado = obtener_traslado(codigo)
    datos = traslado.to_dict()

    for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
        local = fila_local(nombre)
        bodega = fila_bodega(nombre, crear=True)
        if local is None or (local.existencias or 0) < cantidad:
            raise ErrorAPI(
                f"No se puede anular: el local ya no tiene {cantidad} unidades de '{nombre}'",
                409,
            )
        local.existencias -= cantidad
        bodega.existencias = (bodega.existencias or 0) + cantidad

    db.session.delete(traslado)
    db.session.commit()
