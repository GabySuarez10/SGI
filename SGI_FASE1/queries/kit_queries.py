"""
Materiales de los kits (5 pinturas + 1 pincel por figura).

Son dos productos fijos del catálogo, cada uno con existencias en el local y
en la bodega:
    KIT-PINTURAS  -> "Pinturas para kits"
    KIT-PINCELES  -> "Pinceles para kits"

  * "Kit para llevar"      (se arma en el local) -> se descuentan del LOCAL
  * "Empresa con contrato" (recreacionales, se arman en la bodega) -> de la BODEGA

Al anular la venta se devuelven al mismo lugar.
"""

from database import db
from models import Producto, InventarioBodega, InventarioLocal
from utils.errores import ErrorAPI
from utils.precios import KIT_LLEVAR, EMPRESA_CONTRATO

REF_PINTURAS = "KIT-PINTURAS"
REF_PINCELES = "KIT-PINCELES"
NOMBRES = {REF_PINTURAS: "Pinturas para kits", REF_PINCELES: "Pinceles para kits"}


def lugar_de_kits(modalidad):
    """'local', 'bodega' o None si la modalidad no entrega kit."""
    if modalidad == KIT_LLEVAR:
        return "local"
    if modalidad == EMPRESA_CONTRATO:
        return "bodega"
    return None


def _producto(referencia):
    producto = Producto.query.filter(db.func.upper(Producto.referencia) == referencia).first()
    if producto is None:
        raise ErrorAPI(
            f"No existe el producto '{NOMBRES[referencia]}' ({referencia}). "
            "Ejecuta el SQL de materiales para kits y carga sus unidades.",
            409,
        )
    return producto


def _fila(producto, lugar):
    modelo = InventarioLocal if lugar == "local" else InventarioBodega
    fila = modelo.query.filter(modelo.codigo == producto.codigo).with_for_update().first()
    if fila is None:
        # El producto existe pero aún no tiene fila en ese lugar: se crea en 0
        datos = dict(codigo=producto.codigo, nombre=producto.nombre, imagen=producto.imagen,
                     proveedor=producto.proveedor, tamano=producto.tamano, existencias=0)
        if lugar == "local":
            datos.update(precio_venta=producto.precio_venta or 0, precio_mayorista=producto.precio_mayorista or 0)
        else:
            datos.update(descripcion=producto.descripcion, costo=producto.costo or 0)
        fila = modelo(**datos)
        db.session.add(fila)
        db.session.flush()
    return fila


def necesarios(kits, config):
    """{referencia: unidades} que necesitan `kits` kits."""
    return {
        REF_PINTURAS: kits * int(config.get("pinturas_por_kit", 5) or 0),
        REF_PINCELES: kits * int(config.get("pinceles_por_kit", 1) or 0),
    }


def descontar(modalidad, kits, config):
    """Descuenta los materiales de `kits` kits. Devuelve {nombre: unidades} usadas."""
    lugar = lugar_de_kits(modalidad)
    if not lugar or kits <= 0:
        return {}
    usados = {}
    nombre_lugar = "el local" if lugar == "local" else "la bodega"
    for referencia, unidades in necesarios(kits, config).items():
        if unidades <= 0:
            continue
        fila = _fila(_producto(referencia), lugar)
        if (fila.existencias or 0) < unidades:
            raise ErrorAPI(
                f"No hay suficientes {NOMBRES[referencia].lower()} en {nombre_lugar} para {kits} kit(s): "
                f"hay {fila.existencias or 0}, se necesitan {unidades}"
            )
        fila.existencias = (fila.existencias or 0) - unidades
        usados[NOMBRES[referencia]] = unidades
    return usados


def devolver(modalidad, kits, config):
    """Devuelve al inventario los materiales de `kits` kits (al anular una venta)."""
    lugar = lugar_de_kits(modalidad)
    if not lugar or kits <= 0:
        return
    for referencia, unidades in necesarios(kits, config).items():
        if unidades <= 0:
            continue
        try:
            producto = _producto(referencia)
        except ErrorAPI:
            continue
        fila = _fila(producto, lugar)
        fila.existencias = (fila.existencias or 0) + unidades


def existencias_kits():
    """Unidades disponibles de pinturas y pinceles para kits en el local y en la bodega."""
    resultado = {}
    for referencia in (REF_PINTURAS, REF_PINCELES):
        producto = Producto.query.filter(db.func.upper(Producto.referencia) == referencia).first()
        local = db.session.get(InventarioLocal, producto.codigo) if producto else None
        bodega = db.session.get(InventarioBodega, producto.codigo) if producto else None
        resultado[referencia] = {
            "existe": producto is not None,
            "codigo": producto.codigo if producto else None,
            "nombre": NOMBRES[referencia],
            "local": (local.existencias or 0) if local else 0,
            "bodega": (bodega.existencias or 0) if bodega else 0,
        }
    return resultado
