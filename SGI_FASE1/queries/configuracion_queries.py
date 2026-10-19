"""Tarifas de envío y valores generales editables (tablas tarifa_envio y configuracion)."""

from database import db
from models import TarifaEnvio, TarifaKit, Configuracion
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


def _guardar_tabla(modelo, lista, que="tarifa"):
    """
    Reemplaza una tabla de tarifas (envío o kit) con la lista enviada.
    Body: [ {"id": 1, "nombre": "Mini", "precio": 400}, {"nombre": "Gigante", "precio": 3500} ]
    Las filas que no vengan en la lista se eliminan.
    """
    if not isinstance(lista, list):
        raise ErrorAPI(f"Envía una lista de {que}s")

    nombres = set()
    conservar = set()
    for orden, datos in enumerate(lista, start=1):
        nombre = (datos.get("nombre") or "").strip()
        if not nombre:
            raise ErrorAPI(f"La {que} {orden} no tiene nombre")
        if nombre.lower() in nombres:
            raise ErrorAPI(f"La {que} '{nombre}' está repetida")
        nombres.add(nombre.lower())

        fila = db.session.get(modelo, datos["id"]) if datos.get("id") else None
        if fila is None:
            fila = modelo()
            db.session.add(fila)
        fila.nombre = nombre[:40]
        fila.precio = entero(datos.get("precio") or 0, f"precio de '{nombre}'", 0)
        fila.orden = orden
        db.session.flush()
        conservar.add(fila.id)

    for fila in modelo.query.all():
        if fila.id not in conservar:
            db.session.delete(fila)

    db.session.commit()


def guardar_tarifas(lista):
    _guardar_tabla(TarifaEnvio, lista, "tarifa")
    return listar_tarifas()


# ---------------- Kits por tamaño ----------------

def listar_tarifas_kit():
    return TarifaKit.query.order_by(TarifaKit.orden, TarifaKit.precio).all()


def guardar_tarifas_kit(lista):
    _guardar_tabla(TarifaKit, lista, "tarifa de kit")
    return listar_tarifas_kit()


def mapa_tarifas_kit():
    """{nombre en minúsculas: precio} para calcular el kit de cada figura."""
    try:
        return {(t.nombre or "").strip().lower(): t.precio or 0 for t in listar_tarifas_kit()}
    except Exception:  # noqa: BLE001 - la tabla aún no existe (falta ejecutar la migración)
        db.session.rollback()
        return {}


def kit_de_producto(producto, tarifas_kit, config):
    """Valor del kit para llevar de un producto (0 si no es figura)."""
    from utils.precios import precio_kit_figura
    if producto is None or (producto.tipo or "figura") != "figura":
        return 0
    return precio_kit_figura(
        producto.precio_kit, producto.kit_categoria, producto.envio_categoria,
        tarifas_kit, config.get("valor_kit_local", 0),
    )
