"""Tarifas de envío y valores generales editables (tablas tarifa_envio y configuracion)."""

from database import db
from models import TarifaEnvio, Configuracion
from queries.comunes import entero
from utils.errores import ErrorAPI

# Valores por defecto si la tabla configuracion aún no tiene la clave
VALORES_POR_DEFECTO = {
    "multiplicador_crudo": 4,
    "divisor_mayor": 2,
    "valor_kit_local": 2300,
    "valor_pintar_local": 3000,
    "valor_pintada": 4300,
    "precio_kit_contrato": 13000,
    "pinturas_por_kit": 5,
    "pinceles_por_kit": 1,
}


# ---------------- Configuración general ----------------

def valores():
    """Diccionario {clave: valor} con los valores por defecto completados."""
    datos = dict(VALORES_POR_DEFECTO)
    for fila in Configuracion.query.all():
        datos[fila.clave] = fila.valor
    return datos


def listar_configuracion():
    return Configuracion.query.order_by(Configuracion.clave).all()


def actualizar_configuracion(data):
    """Body: { "precio_kit_contrato": 14000, "valor_kit_local": 2500, ... }"""
    if not isinstance(data, dict) or not data:
        raise ErrorAPI("Envía al menos un valor para actualizar")
    for clave, valor in data.items():
        if clave not in VALORES_POR_DEFECTO:
            raise ErrorAPI(f"La clave '{clave}' no existe en la configuración")
        numero = entero(valor, clave, 0)
        if clave == "divisor_mayor" and numero == 0:
            raise ErrorAPI("El divisor del precio por mayor no puede ser 0")
        fila = db.session.get(Configuracion, clave)
        if fila is None:
            fila = Configuracion(clave=clave)
            db.session.add(fila)
        fila.valor = numero
    db.session.commit()
    return valores()


# ---------------- Tarifas de envío ----------------

def listar_tarifas():
    return TarifaEnvio.query.order_by(TarifaEnvio.orden, TarifaEnvio.precio).all()


def guardar_tarifas(lista):
    """
    Reemplaza la tabla de tarifas con la lista enviada.
    Body: [ {"id": 1, "nombre": "Mini", "precio": 400}, {"nombre": "Gigante", "precio": 3500} ]
    Las tarifas que no vengan en la lista se eliminan.
    """
    if not isinstance(lista, list):
        raise ErrorAPI("Envía una lista de tarifas")

    nombres = set()
    conservar = set()
    for orden, datos in enumerate(lista, start=1):
        nombre = (datos.get("nombre") or "").strip()
        if not nombre:
            raise ErrorAPI(f"La tarifa {orden} no tiene nombre")
        if nombre.lower() in nombres:
            raise ErrorAPI(f"La tarifa '{nombre}' está repetida")
        nombres.add(nombre.lower())

        tarifa = db.session.get(TarifaEnvio, datos["id"]) if datos.get("id") else None
        if tarifa is None:
            tarifa = TarifaEnvio()
            db.session.add(tarifa)
        tarifa.nombre = nombre[:40]
        tarifa.precio = entero(datos.get("precio") or 0, f"precio de '{nombre}'", 0)
        tarifa.orden = orden
        db.session.flush()
        conservar.add(tarifa.id)

    for tarifa in TarifaEnvio.query.all():
        if tarifa.id not in conservar:
            db.session.delete(tarifa)

    db.session.commit()
    return listar_tarifas()
