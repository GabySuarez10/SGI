"""Consultas de Inventario_bodega e Inventario_local."""

from database import db
from utils.precios import precios_pintura
from models import InventarioBodega, InventarioLocal, Producto
from queries.comunes import obtener_o_404, buscar_por_nombre, entero
from queries.configuracion_queries import valores as valores_configuracion, mapa_tarifas_kit, kit_de_producto
from utils.errores import NoEncontrado

# ------------------------------------------------------------------
# Bodega
# ------------------------------------------------------------------

def _datos_catalogo():
    """{codigo: Producto} del catálogo para agregar sus datos a los inventarios."""
    return {producto.codigo: producto for producto in Producto.query.all()}


def con_tipo(filas):
    """
    Filas de inventario como dicts con tipo, colección, referencia y categoría
    del catálogo, y los precios de pintar en el local y figura terminada.
    """
    catalogo = _datos_catalogo()
    tarifas_kit, config = mapa_tarifas_kit(), valores_configuracion()
    resultado = []
    for fila in filas:
        item = fila.to_dict()
        producto = catalogo.get(fila.codigo)
        if producto is None:
            item.update(tipo="figura", coleccion="", referencia="", categoria="",
                        precio_pintar_local=0, precio_terminada=0,
                        precio_kit=config.get("valor_kit_local", 0), kit_categoria="")
        else:
            tipo = producto.tipo or "figura"
            pintar, terminada = (0, 0)
            if tipo == "figura":
                # Se parte del crudo del local (o del catálogo si el local no lo tiene)
                crudo = item.get("precio_venta") or producto.precio_venta or 0
                pintar, terminada = precios_pintura(
                    crudo, producto.precio_pintar_local, producto.precio_terminada
                )
            item.update(
                tipo=tipo, coleccion=producto.coleccion or "", referencia=producto.referencia or "",
                categoria=producto.categoria or "",
                precio_pintar_local=pintar, precio_terminada=terminada,
                precio_kit=kit_de_producto(producto, tarifas_kit, config),
                kit_categoria=producto.kit_categoria or "",
            )
        resultado.append(item)
    return resultado


def listar_bodega():
    return InventarioBodega.query.order_by(InventarioBodega.codigo).all()


def obtener_bodega(codigo):
    return obtener_o_404(InventarioBodega, codigo, "Producto no encontrado en bodega")


def actualizar_bodega(codigo, data):
    """Ajuste manual de existencias o costo en bodega."""
    item = obtener_bodega(codigo)
    if "existencias" in data:
        item.existencias = entero(data["existencias"], "existencias", 0)
    if "costo" in data:
        item.costo = entero(data["costo"], "costo", 0)
    db.session.commit()
    return item


# ------------------------------------------------------------------
# Local
# ------------------------------------------------------------------

def listar_local():
    return InventarioLocal.query.order_by(InventarioLocal.codigo).all()


def obtener_local(codigo):
    return obtener_o_404(InventarioLocal, codigo, "Producto no encontrado en el local")


def actualizar_local(codigo, data):
    """Ajuste manual de existencias o precios en el local."""
    item = obtener_local(codigo)
    if "existencias" in data:
        item.existencias = entero(data["existencias"], "existencias", 0)
    producto = db.session.get(Producto, codigo)
    if "precio_venta" in data:
        item.precio_venta = entero(data["precio_venta"], "precio_venta", 0)
        if producto is not None:
            producto.precio_venta = item.precio_venta
    if "precio_mayorista" in data:
        item.precio_mayorista = entero(data["precio_mayorista"], "precio_mayorista", 0)
        if producto is not None:
            producto.precio_mayorista = item.precio_mayorista
    db.session.commit()
    return item


# ------------------------------------------------------------------
# Ayudas usadas por traslados, ventas y pedidos (no hacen commit)
# ------------------------------------------------------------------

def _producto_por_nombre(nombre):
    producto = buscar_por_nombre(Producto, nombre)
    if producto is None:
        raise NoEncontrado(f"El producto '{nombre}' no existe en el catálogo")
    return producto


def fila_bodega(nombre, crear=False):
    """
    Fila de bodega del producto (bloqueada para actualizar el stock).
    Si crear=True y no existe, se crea con 0 existencias desde el catálogo.
    """
    fila = buscar_por_nombre(InventarioBodega, nombre, bloquear=True)
    if fila is None and crear:
        producto = _producto_por_nombre(nombre)
        fila = db.session.get(InventarioBodega, producto.codigo)
        if fila is None:
            fila = InventarioBodega(
                codigo=producto.codigo, nombre=producto.nombre, imagen=producto.imagen,
                proveedor=producto.proveedor, tamano=producto.tamano,
                descripcion=producto.descripcion, costo=producto.costo, existencias=0,
            )
            db.session.add(fila)
    return fila


def fila_local(nombre, crear=False, codigo=None):
    """
    Fila del local del producto (bloqueada para actualizar el stock).
    Si crear=True y no existe, se crea con 0 existencias desde el catálogo.
    """
    fila = None
    if codigo is not None:
        fila = InventarioLocal.query.filter(InventarioLocal.codigo == codigo).with_for_update().first()
    if fila is None:
        fila = buscar_por_nombre(InventarioLocal, nombre, bloquear=True)
    if fila is None and crear:
        producto = _producto_por_nombre(nombre)
        fila = db.session.get(InventarioLocal, producto.codigo)
        if fila is None:
            fila = InventarioLocal(
                codigo=producto.codigo, nombre=producto.nombre, imagen=producto.imagen,
                proveedor=producto.proveedor, tamano=producto.tamano, existencias=0,
                precio_venta=producto.precio_venta or 0,
                precio_mayorista=producto.precio_mayorista or 0,
            )
            db.session.add(fila)
    return fila
