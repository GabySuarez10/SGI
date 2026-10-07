import re
import unicodedata

from database import db
from models import Producto, Proveedor, InventarioBodega, InventarioLocal
from queries.comunes import obtener_o_404, buscar_por_nombre, entero
from utils.errores import ErrorAPI

# Campos del catálogo que también se copian en Inventario_bodega / Inventario_local
CAMPOS_COMPARTIDOS = ("nombre", "imagen", "proveedor", "tamano")


# ------------------------------------------------------------------
# Consultas
# ------------------------------------------------------------------

def _con_existencias(producto, bodega, local):
    """
    Agrega al producto sus existencias en bodega y local, y los precios
    de venta del local. bodega/local pueden ser None si no hay fila.
    """
    item = producto.to_dict()
    item["existencias_bodega"] = (bodega.existencias or 0) if bodega else 0
    item["existencias_local"] = (local.existencias or 0) if local else 0
    item["existencias"] = item["existencias_bodega"] + item["existencias_local"]
    item["precio_venta"] = (local.precio_venta or 0) if local else 0
    item["precio_mayorista"] = (local.precio_mayorista or 0) if local else 0
    return item


def listar_productos():
    """
    Catálogo completo con las existencias de bodega y local de cada producto.
    Devuelve una lista de diccionarios listos para JSON.
    """
    productos = Producto.query.order_by(Producto.codigo).all()
    bodega = {fila.codigo: fila for fila in InventarioBodega.query.all()}
    local = {fila.codigo: fila for fila in InventarioLocal.query.all()}

    return [
        _con_existencias(p, bodega.get(p.codigo), local.get(p.codigo))
        for p in productos
    ]


def obtener_producto(codigo):
    return obtener_o_404(Producto, codigo, f"Producto con código {codigo} no encontrado")


def obtener_producto_detallado(codigo):
    """Un producto con sus existencias y precios del local."""
    producto = obtener_producto(codigo)
    return _con_existencias(
        producto,
        db.session.get(InventarioBodega, codigo),
        db.session.get(InventarioLocal, codigo),
    )


# ------------------------------------------------------------------
# Validaciones
# ------------------------------------------------------------------

def _validar_nombre(nombre, codigo_actual=None):
    nombre = (nombre or "").strip()
    if not nombre:
        raise ErrorAPI("El nombre del producto es obligatorio")
    if "," in nombre:
        # Las ventas, pedidos y traslados separan los productos con comas
        raise ErrorAPI("El nombre del producto no puede contener comas (,)")
    existente = buscar_por_nombre(Producto, nombre)
    if existente and existente.codigo != codigo_actual:
        raise ErrorAPI(f"Ya existe un producto llamado '{nombre}'", 409)
    return nombre


def _validar_proveedor(nombre):
    nombre = (nombre or "").strip()
    if not nombre:
        raise ErrorAPI("Selecciona un proveedor")
    if db.session.get(Proveedor, nombre) is None:
        raise ErrorAPI(f"El proveedor '{nombre}' no existe", 404)
    return nombre


def _generar_referencia(proveedor):
    """
    Crea una referencia a partir de las iniciales del proveedor.
    'Arte y Color' -> 'AC0001', 'AC0002', ...
    """
    sin_tildes = unicodedata.normalize("NFKD", proveedor).encode("ascii", "ignore").decode()
    palabras = [p for p in re.split(r"\W+", sin_tildes) if len(p) > 1] or ["PR"]
    prefijo = "".join(p[0] for p in palabras[:2]).upper()
    if len(prefijo) < 2:
        prefijo = (palabras[0][:2]).upper()

    numero = Producto.query.filter(Producto.referencia.like(f"{prefijo}%")).count() + 1
    while True:
        referencia = f"{prefijo}{numero:04d}"
        if not Producto.query.filter(Producto.referencia == referencia).first():
            return referencia
        numero += 1


# ------------------------------------------------------------------
# Crear / actualizar / eliminar
# ------------------------------------------------------------------

def crear_productos(data):
    """
    Registra uno o varios productos de un mismo proveedor.

    Body admitido:
      { "proveedor": "Arte y Color",
        "productos": [ {nombre, tamano, descripcion, imagen, referencia?,
                        costo?, precio_venta?, precio_mayorista?}, ... ] }
    o un solo producto: { "proveedor": ..., "nombre": ..., ... }

    Cada producto nuevo queda también en Inventario_bodega e Inventario_local
    con 0 existencias, para que los pedidos y traslados puedan sumarle stock.
    """
    proveedor = _validar_proveedor(data.get("proveedor"))
    lista = data.get("productos")
    if lista is None:
        lista = [data]
    if not isinstance(lista, list) or not lista:
        raise ErrorAPI("Envía al menos un producto")

    nombres_lote = set()
    creados = []
    for i, datos in enumerate(lista, start=1):
        nombre = _validar_nombre(datos.get("nombre"))
        if nombre.lower() in nombres_lote:
            raise ErrorAPI(f"El producto '{nombre}' está repetido en el formulario")
        nombres_lote.add(nombre.lower())

        tamano = (datos.get("tamano") or "").strip()
        if not tamano:
            raise ErrorAPI(f"El tamaño del producto {i} es obligatorio")

        referencia = (datos.get("referencia") or "").strip() or _generar_referencia(proveedor)
        producto = Producto(
            referencia=referencia[:15],
            nombre=nombre,
            imagen=(datos.get("imagen") or "").strip(),
            proveedor=proveedor,
            tamano=tamano[:20],
            descripcion=datos.get("descripcion") or "",
            costo=entero(datos.get("costo") or 0, "costo", 0),
        )
        db.session.add(producto)
        db.session.flush()  # obtiene el código generado por la base de datos

        db.session.add(InventarioBodega(
            codigo=producto.codigo,
            nombre=producto.nombre,
            imagen=producto.imagen,
            proveedor=producto.proveedor,
            tamano=producto.tamano,
            descripcion=producto.descripcion,
            costo=producto.costo,
            existencias=0,
        ))
        db.session.add(InventarioLocal(
            codigo=producto.codigo,
            nombre=producto.nombre,
            imagen=producto.imagen,
            proveedor=producto.proveedor,
            tamano=producto.tamano,
            existencias=0,
            precio_venta=entero(datos.get("precio_venta") or 0, "precio_venta", 0),
            precio_mayorista=entero(datos.get("precio_mayorista") or 0, "precio_mayorista", 0),
        ))
        creados.append(producto)

    db.session.commit()
    return creados


def actualizar_producto(codigo, data):
    """
    Actualiza el catálogo y sincroniza los datos copiados en los inventarios
    (nombre, imagen, proveedor, tamaño, descripción, costo y precios del local).
    """
    producto = obtener_producto(codigo)

    if "nombre" in data:
        producto.nombre = _validar_nombre(data["nombre"], codigo_actual=codigo)
    if "proveedor" in data:
        producto.proveedor = _validar_proveedor(data["proveedor"])
    if "tamano" in data:
        producto.tamano = (data["tamano"] or "").strip()[:20]
    if "referencia" in data and (data["referencia"] or "").strip():
        producto.referencia = data["referencia"].strip()[:15]
    for campo in ("imagen", "descripcion"):
        if campo in data:
            setattr(producto, campo, data[campo] or "")
    if "costo" in data:
        producto.costo = entero(data["costo"] or 0, "costo", 0)

    bodega = db.session.get(InventarioBodega, codigo)
    local = db.session.get(InventarioLocal, codigo)
    for inventario in (bodega, local):
        if inventario is None:
            continue
        for campo in CAMPOS_COMPARTIDOS:
            setattr(inventario, campo, getattr(producto, campo))
    if bodega is not None:
        bodega.descripcion = producto.descripcion
        bodega.costo = producto.costo
    if local is not None:
        if "precio_venta" in data:
            local.precio_venta = entero(data["precio_venta"] or 0, "precio_venta", 0)
        if "precio_mayorista" in data:
            local.precio_mayorista = entero(data["precio_mayorista"] or 0, "precio_mayorista", 0)

    db.session.commit()
    return producto


def eliminar_producto(codigo):
    """Elimina el producto del catálogo y de ambos inventarios."""
    producto = obtener_producto(codigo)
    for modelo in (InventarioBodega, InventarioLocal):
        fila = db.session.get(modelo, codigo)
        if fila is not None:
            db.session.delete(fila)
    db.session.delete(producto)
    db.session.commit()
