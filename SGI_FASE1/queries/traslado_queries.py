"""
Traslados entre BODEGA y LOCAL, en cualquiera de los dos sentidos.

  sentido = "bodega_local"  -> sale de bodega y entra al local  (por defecto)
  sentido = "local_bodega"  -> sale del local y entra a bodega

Registrar un traslado:
  1. Descuenta las unidades del inventario de origen.
  2. Suma las unidades al inventario de destino (crea la fila si no existía).
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

SENTIDOS = {
    "bodega_local": ("bodega", "local"),
    "local_bodega": ("local", "bodega"),
}
NOMBRE_LUGAR = {"bodega": "la bodega", "local": "el local"}


def _fila(lugar, nombre, crear=False, codigo=None):
    if lugar == "bodega":
        return fila_bodega(nombre, crear=crear)
    return fila_local(nombre, crear=crear, codigo=codigo)


def _mover(nombre, cantidad, origen, destino, accion="trasladar"):
    """Pasa unidades de un inventario al otro. Devuelve el nombre exacto del producto."""
    fila_origen = _fila(origen, nombre)
    if fila_origen is None:
        raise NoEncontrado(f"'{nombre}' no está registrado en {NOMBRE_LUGAR[origen]}")
    if (fila_origen.existencias or 0) < cantidad:
        raise ErrorAPI(
            f"Stock insuficiente en {NOMBRE_LUGAR[origen]} para '{fila_origen.nombre}': "
            f"hay {fila_origen.existencias or 0}, se intentan {accion} {cantidad}",
            409 if accion == "devolver" else 400,
        )
    fila_destino = _fila(destino, fila_origen.nombre, crear=True, codigo=fila_origen.codigo)
    fila_origen.existencias = (fila_origen.existencias or 0) - cantidad
    fila_destino.existencias = (fila_destino.existencias or 0) + cantidad
    return fila_origen.nombre


def listar_traslados():
    return Traslado.query.order_by(Traslado.fecha.desc(), Traslado.codigo.desc()).all()


def obtener_traslado(codigo):
    return obtener_o_404(Traslado, codigo, "Traslado no encontrado")


def crear_traslado(data):
    """
    Body: { "producto": ["Lapiz HB", "Borrador blanco"], "cantidad": [10, 5],
            "sentido": "bodega_local" | "local_bodega",   (por defecto bodega_local)
            "fecha": "2026-10-07" (opcional) }
    También acepta texto: "producto": "Lapiz HB, Borrador blanco".
    """
    sentido = (data.get("sentido") or "bodega_local").strip().lower()
    if sentido not in SENTIDOS:
        raise ErrorAPI("El sentido debe ser 'bodega_local' o 'local_bodega'")
    origen, destino = SENTIDOS[sentido]

    nombres = lista_textos(data.get("producto"))
    cantidades = lista_numeros(data.get("cantidad"))

    if not nombres:
        raise ErrorAPI("Selecciona al menos un producto para trasladar")
    validar_listas_mismo_largo(producto=nombres, cantidad=cantidades)
    validar_sin_repetidos(nombres)

    nombres_guardados = []
    for nombre, cantidad in zip(nombres, cantidades):
        cantidad = entero(cantidad, f"cantidad de '{nombre}'", 1)
        nombres_guardados.append(_mover(nombre, cantidad, origen, destino))

    traslado = Traslado(
        producto=lista_a_texto(nombres_guardados),
        cantidad=lista_a_texto(cantidades),
        sentido=sentido,
    )
    fecha = a_fecha(data.get("fecha"))
    if fecha:
        traslado.fecha = fecha

    db.session.add(traslado)
    db.session.commit()
    db.session.refresh(traslado)
    return traslado


def eliminar_traslado(codigo):
    """Anula un traslado: devuelve las unidades del destino al origen."""
    traslado = obtener_traslado(codigo)
    datos = traslado.to_dict()
    origen, destino = SENTIDOS.get(datos["sentido"], SENTIDOS["bodega_local"])

    for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
        _mover(nombre, cantidad, destino, origen, accion="devolver")

    db.session.delete(traslado)
    db.session.commit()
