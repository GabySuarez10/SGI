"""
Catálogo de productos.

- La sección Productos muestra TODOS los productos (tabla Producto).
- Bodega y Local muestran los productos que tienen fila en Inventario_bodega o
  Inventario_local. Al crear un producto se elige su ubicación inicial
  (bodega, local o ambos) y las existencias con las que entra.
- Precios: costo = precio de fábrica. precio_venta (crudo) y precio_mayorista se
  calculan solos con utils/precios.py (fábrica × 4 + envío, y ÷ 2 + envío),
  pero si el front envía otro valor se respeta (los campos son editables).
"""

import re
import unicodedata

from database import db
from models import (
    Producto, Proveedor, InventarioBodega, InventarioLocal, ColeccionMaterial, PedidoProveedor,
)
from queries.comunes import obtener_o_404, buscar_por_nombre, entero
from queries.configuracion_queries import valores as valores_configuracion
from queries.categoria_queries import buscar_categoria
from utils.errores import ErrorAPI
from utils.precios import calcular_precios

# Campos del catálogo que también se copian en Inventario_bodega / Inventario_local
CAMPOS_COMPARTIDOS = ("nombre", "imagen", "proveedor", "tamano")

UBICACIONES = ("bodega", "local", "ambos")

# figura = figuras de yeso; el resto son materiales que también se venden
TIPOS = ("figura", "pintura", "pincel", "otro")


# ------------------------------------------------------------------
# Consultas
# ------------------------------------------------------------------

def _con_existencias(producto, bodega, local, proveedor=None):
    """
    Agrega al producto su ubicación, existencias en bodega y local y el límite
    de precio de su proveedor. bodega/local pueden ser None si no hay fila.
    """
    item = producto.to_dict()
    item["en_bodega"] = bodega is not None
    item["en_local"] = local is not None
    item["existencias_bodega"] = (bodega.existencias or 0) if bodega else 0
    item["existencias_local"] = (local.existencias or 0) if local else 0
    item["existencias"] = item["existencias_bodega"] + item["existencias_local"]
    # Si el catálogo aún no tiene precios (datos antiguos) se usan los del local
    if not item["precio_venta"] and local:
        item["precio_venta"] = local.precio_venta or 0
    if not item["precio_mayorista"] and local:
        item["precio_mayorista"] = local.precio_mayorista or 0
    item["limite_precio_proveedor"] = proveedor.limite_precio if proveedor else None
    return item


def listar_productos():
    """Catálogo completo con ubicación, existencias y precios de cada producto."""
    productos = Producto.query.order_by(Producto.codigo).all()
    bodega = {fila.codigo: fila for fila in InventarioBodega.query.all()}
    local = {fila.codigo: fila for fila in InventarioLocal.query.all()}
    proveedores = {p.nombre: p for p in Proveedor.query.all()}

    return [
        _con_existencias(p, bodega.get(p.codigo), local.get(p.codigo), proveedores.get(p.proveedor))
        for p in productos
    ]


def obtener_producto(codigo):
    return obtener_o_404(Producto, codigo, f"Producto con código {codigo} no encontrado")


def obtener_producto_detallado(codigo):
    producto = obtener_producto(codigo)
    return _con_existencias(
        producto,
        db.session.get(InventarioBodega, codigo),
        db.session.get(InventarioLocal, codigo),
        db.session.get(Proveedor, producto.proveedor) if producto.proveedor else None,
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


# Palabras que no cuentan para las iniciales de la referencia
PALABRAS_IGNORADAS = {"la", "el", "los", "las", "de", "del", "y", "e", "en", "sas", "ltda", "sa"}


def prefijo_referencia(proveedor):
    """
    Iniciales del proveedor (dos letras):
      'Casa del Arte' -> 'CA', 'Fredy Bogotá' -> 'FB', 'La Casa del Arte' -> 'CA'
    """
    sin_tildes = unicodedata.normalize("NFKD", proveedor or "").encode("ascii", "ignore").decode()
    palabras = [p for p in re.split(r"[^A-Za-z0-9]+", sin_tildes) if p]
    utiles = [p for p in palabras if p.lower() not in PALABRAS_IGNORADAS] or palabras or ["PR"]
    if len(utiles) >= 2:
        return (utiles[0][0] + utiles[1][0]).upper()
    return (utiles[0][:2]).upper().ljust(2, "X")


def _generar_referencia(proveedor):
    """
    Iniciales del proveedor + consecutivo de 5 dígitos: CA00001, CA00002, FB00001...
    El consecutivo es por prefijo e incluye figuras, pinturas, pinceles y otros.
    """
    prefijo = prefijo_referencia(proveedor)
    patron = re.compile(rf"^{prefijo}(\d+)$")
    mayor = 0
    for (referencia,) in db.session.query(Producto.referencia).filter(
        Producto.referencia.like(f"{prefijo}%")
    ):
        coincide = patron.match((referencia or "").strip())
        if coincide:
            mayor = max(mayor, int(coincide.group(1)))
    return f"{prefijo}{mayor + 1:05d}"


def _validar_tipo(tipo):
    tipo = (tipo or "figura").strip().lower()
    if tipo not in TIPOS:
        raise ErrorAPI(f"Tipo de producto no válido. Usa: {', '.join(TIPOS)}")
    return tipo


def _validar_coleccion(tipo, coleccion):
    """Las pinturas deben pertenecer a una colección existente; el resto no lleva colección."""
    if tipo != "pintura":
        return None
    coleccion = (coleccion or "").strip()
    if not coleccion:
        raise ErrorAPI("Elige la colección de la pintura (Acrílicas, Pátinas, ...)")
    existente = ColeccionMaterial.query.filter(
        db.func.lower(ColeccionMaterial.nombre) == coleccion.lower()
    ).first()
    if existente is None:
        raise ErrorAPI(f"La colección '{coleccion}' no existe. Créala en Materiales.", 404)
    return existente.nombre


def _asignar_precios(producto, datos, config):
    """
    Costo, envío y precios.
    Figuras: si precio_venta / precio_mayorista no llegan (o llegan vacíos) se
    calculan con la fórmula; si llegan, se respeta el valor editado.
    Materiales (pinturas, pinceles, otros): los precios se escriben a mano y no
    llevan envío por tamaño.
    """
    if "costo" in datos:
        producto.costo = entero(datos.get("costo") or 0, "precio de fábrica", 0)
    if "envio" in datos:
        producto.envio = entero(datos.get("envio") or 0, "envío", 0)
    if "envio_categoria" in datos:
        producto.envio_categoria = (datos.get("envio_categoria") or "").strip()[:40]

    if (producto.tipo or "figura") != "figura":
        producto.envio = 0
        producto.envio_categoria = ""
        crudo, mayor = 0, 0
    else:
        crudo, mayor = calcular_precios(
            producto.costo, producto.envio,
            config["multiplicador_crudo"], config["divisor_mayor"],
        )
    precio_venta = datos.get("precio_venta")
    precio_mayorista = datos.get("precio_mayorista")
    producto.precio_venta = crudo if precio_venta in (None, "") else entero(precio_venta, "precio crudo", 0)
    producto.precio_mayorista = mayor if precio_mayorista in (None, "") else entero(precio_mayorista, "precio por mayor", 0)


def _fila_bodega_desde(producto, existencias=0):
    return InventarioBodega(
        codigo=producto.codigo, nombre=producto.nombre, imagen=producto.imagen,
        proveedor=producto.proveedor, tamano=producto.tamano,
        descripcion=producto.descripcion, costo=producto.costo, existencias=existencias,
    )


def _fila_local_desde(producto, existencias=0):
    return InventarioLocal(
        codigo=producto.codigo, nombre=producto.nombre, imagen=producto.imagen,
        proveedor=producto.proveedor, tamano=producto.tamano, existencias=existencias,
        precio_venta=producto.precio_venta or 0, precio_mayorista=producto.precio_mayorista or 0,
    )


# ------------------------------------------------------------------
# Crear / actualizar / eliminar
# ------------------------------------------------------------------

def crear_productos(data):
    """
    Registra uno o varios productos de un mismo proveedor.

    Body:
      { "proveedor": "Arte y Color",
        "ubicacion": "bodega" | "local" | "ambos",       (por defecto "bodega")
        "productos": [ { nombre, tamano, descripcion, imagen, referencia?,
                         costo, envio_categoria, envio,
                         precio_venta?, precio_mayorista?,      (vacíos = se calculan)
                         existencias? } ] }                     (unidades iniciales)
    """
    proveedor = _validar_proveedor(data.get("proveedor"))
    ubicacion = (data.get("ubicacion") or "bodega").strip().lower()
    if ubicacion not in UBICACIONES:
        raise ErrorAPI("La ubicación debe ser 'bodega', 'local' o 'ambos'")

    lista = data.get("productos")
    if lista is None:
        lista = [data]
    if not isinstance(lista, list) or not lista:
        raise ErrorAPI("Envía al menos un producto")

    config = valores_configuracion()
    nombres_lote = set()
    creados = []
    for i, datos in enumerate(lista, start=1):
        nombre = _validar_nombre(datos.get("nombre"))
        if nombre.lower() in nombres_lote:
            raise ErrorAPI(f"El producto '{nombre}' está repetido en el formulario")
        nombres_lote.add(nombre.lower())

        tipo = _validar_tipo(datos.get("tipo") or data.get("tipo"))
        coleccion = _validar_coleccion(tipo, datos.get("coleccion") or data.get("coleccion"))

        tamano = (datos.get("tamano") or "").strip()
        if not tamano and tipo == "figura":
            raise ErrorAPI(f"El tamaño (cm) de la figura {i} es obligatorio")

        # Categoría (Navidad, Materas...): solo figuras y es opcional
        categoria = buscar_categoria(datos.get("categoria")) if tipo == "figura" else None

        referencia = (datos.get("referencia") or "").strip() or _generar_referencia(proveedor)
        producto = Producto(
            tipo=tipo,
            coleccion=coleccion,
            categoria=categoria,
            referencia=referencia[:15],
            nombre=nombre,
            imagen=(datos.get("imagen") or "").strip(),
            proveedor=proveedor,
            tamano=tamano[:60],
            descripcion=datos.get("descripcion") or "",
            costo=0,
            envio=0,
        )
        _asignar_precios(producto, datos, config)
        db.session.add(producto)
        db.session.flush()  # obtiene el código generado por la base de datos

        existencias = entero(datos.get("existencias") or 0, f"existencias de '{nombre}'", 0)
        if ubicacion in ("bodega", "ambos"):
            db.session.add(_fila_bodega_desde(producto, existencias))
        if ubicacion in ("local", "ambos"):
            # Si va a ambos lugares, las existencias iniciales quedan en bodega
            db.session.add(_fila_local_desde(producto, 0 if ubicacion == "ambos" else existencias))
        creados.append(producto)

    db.session.commit()
    return creados


def actualizar_producto(codigo, data):
    """
    Actualiza el catálogo y sincroniza los datos copiados en los inventarios.

    Además acepta:
      existencias_bodega / existencias_local -> ajuste manual de unidades.
          Si el producto no estaba en esa ubicación, se agrega a ella.
    """
    producto = obtener_producto(codigo)

    if "nombre" in data:
        producto.nombre = _validar_nombre(data["nombre"], codigo_actual=codigo)
    if "proveedor" in data:
        producto.proveedor = _validar_proveedor(data["proveedor"])
    if "tamano" in data:
        producto.tamano = (data["tamano"] or "").strip()[:60]
    if "referencia" in data and (data["referencia"] or "").strip():
        producto.referencia = data["referencia"].strip()[:15]
    if "tipo" in data:
        producto.tipo = _validar_tipo(data["tipo"])
    if "tipo" in data or "coleccion" in data:
        producto.coleccion = _validar_coleccion(producto.tipo, data.get("coleccion", producto.coleccion))
    if "categoria" in data:
        producto.categoria = buscar_categoria(data["categoria"])
    if producto.tipo != "figura":
        producto.categoria = None
    for campo in ("imagen", "descripcion"):
        if campo in data:
            setattr(producto, campo, data[campo] or "")

    precios = ("costo", "envio", "envio_categoria", "precio_venta", "precio_mayorista")
    if any(campo in data for campo in precios):
        datos_precio = {c: data[c] for c in precios if c in data}
        # Si no se envía un precio, se conserva el actual (no se recalcula sin pedirlo)
        datos_precio.setdefault("precio_venta", producto.precio_venta)
        datos_precio.setdefault("precio_mayorista", producto.precio_mayorista)
        _asignar_precios(producto, datos_precio, valores_configuracion())

    bodega = db.session.get(InventarioBodega, codigo)
    local = db.session.get(InventarioLocal, codigo)

    if "existencias_bodega" in data and data["existencias_bodega"] not in (None, ""):
        if bodega is None:
            bodega = _fila_bodega_desde(producto)
            db.session.add(bodega)
        bodega.existencias = entero(data["existencias_bodega"], "existencias en bodega", 0)
    if "existencias_local" in data and data["existencias_local"] not in (None, ""):
        if local is None:
            local = _fila_local_desde(producto)
            db.session.add(local)
        local.existencias = entero(data["existencias_local"], "existencias en el local", 0)

    for inventario in (bodega, local):
        if inventario is None:
            continue
        for campo in CAMPOS_COMPARTIDOS:
            setattr(inventario, campo, getattr(producto, campo))
    if bodega is not None:
        bodega.descripcion = producto.descripcion
        bodega.costo = producto.costo
    if local is not None:
        local.precio_venta = producto.precio_venta or 0
        local.precio_mayorista = producto.precio_mayorista or 0

    db.session.commit()
    return producto


def eliminar_producto(codigo):
    """
    Elimina el producto del catálogo y de ambos inventarios.
    No se permite si está en un pedido pendiente (al recibirlo no tendría dónde sumar).
    Las ventas, traslados y pedidos ya hechos conservan el nombre en su historial.
    """
    producto = obtener_producto(codigo)
    nombre = (producto.nombre or "").strip().lower()
    for pedido in PedidoProveedor.query.filter(PedidoProveedor.estado.is_(False)):
        if nombre in (p.strip().lower() for p in (pedido.productos or "").split(",")):
            raise ErrorAPI(
                f"No se puede eliminar: '{producto.nombre}' está en el pedido pendiente "
                f"#{pedido.codigo:03d}. Recíbelo o elimínalo primero.",
                409,
            )
    for modelo in (InventarioBodega, InventarioLocal):
        fila = db.session.get(modelo, codigo)
        if fila is not None:
            db.session.delete(fila)
    db.session.delete(producto)
    db.session.commit()
