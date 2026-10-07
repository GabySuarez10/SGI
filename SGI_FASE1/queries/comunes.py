"""Funciones de apoyo que usan varias consultas."""

from database import db
from utils.errores import ErrorAPI, NoEncontrado


def obtener_o_404(modelo, llave, mensaje):
    """Busca por llave primaria; si no existe lanza NoEncontrado (404)."""
    registro = db.session.get(modelo, llave)
    if registro is None:
        raise NoEncontrado(mensaje)
    return registro


def buscar_por_nombre(modelo, nombre, bloquear=False):
    """
    Busca una fila por la columna nombre, sin importar mayúsculas/minúsculas.
    Se usa porque Venta, Traslado y Pedido_proveedor guardan los NOMBRES de
    los productos (no sus códigos).

    bloquear=True usa SELECT ... FOR UPDATE para que dos operaciones al mismo
    tiempo no descuenten el mismo stock.
    """
    consulta = modelo.query.filter(
        db.func.lower(db.func.trim(modelo.nombre)) == str(nombre).strip().lower()
    )
    if bloquear:
        consulta = consulta.with_for_update()
    return consulta.first()


def validar_listas_mismo_largo(**listas):
    """Verifica que todas las listas tengan la misma cantidad de elementos."""
    largos = {nombre: len(valores) for nombre, valores in listas.items()}
    if len(set(largos.values())) > 1:
        detalle = ", ".join(f"{k}={v}" for k, v in largos.items())
        raise ErrorAPI(f"Las listas deben tener el mismo número de elementos ({detalle})")


def validar_sin_repetidos(nombres):
    vistos = set()
    for nombre in nombres:
        clave = nombre.lower()
        if clave in vistos:
            raise ErrorAPI(f"El producto '{nombre}' está repetido en la lista")
        vistos.add(clave)


def entero(valor, campo, minimo=None):
    """Convierte a entero y valida un mínimo opcional."""
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise ErrorAPI(f"El campo {campo} debe ser un número entero")
    if minimo is not None and numero < minimo:
        raise ErrorAPI(f"El campo {campo} debe ser mayor o igual a {minimo}")
    return numero
