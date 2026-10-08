"""Categorías de figuras (Navidad, Materas, Juveniles, Religioso, Hogar, Terminados...)."""

from database import db
from models import CategoriaFigura, Producto
from queries.comunes import obtener_o_404
from utils.errores import ErrorAPI


def listar_categorias():
    """Categorías con la cantidad de figuras de cada una."""
    conteo = dict(
        db.session.query(Producto.categoria, db.func.count(Producto.codigo))
        .group_by(Producto.categoria)
        .all()
    )
    resultado = []
    for categoria in CategoriaFigura.query.order_by(CategoriaFigura.orden, CategoriaFigura.nombre):
        item = categoria.to_dict()
        item["figuras"] = conteo.get(categoria.nombre, 0)
        resultado.append(item)
    return resultado


def buscar_categoria(nombre):
    """Devuelve el nombre exacto de la categoría (sin importar mayúsculas) o None."""
    nombre = (nombre or "").strip()
    if not nombre:
        return None
    categoria = CategoriaFigura.query.filter(db.func.lower(CategoriaFigura.nombre) == nombre.lower()).first()
    if categoria is None:
        raise ErrorAPI(f"La categoría '{nombre}' no existe. Créala en Configuración.", 404)
    return categoria.nombre


def _nombre_valido(nombre, id_actual=None):
    nombre = (nombre or "").strip()
    if not nombre:
        raise ErrorAPI("Escribe el nombre de la categoría")
    otra = CategoriaFigura.query.filter(db.func.lower(CategoriaFigura.nombre) == nombre.lower()).first()
    if otra and otra.id != id_actual:
        raise ErrorAPI(f"Ya existe la categoría '{nombre}'", 409)
    return nombre[:40]


def crear_categoria(data):
    ultima = db.session.query(db.func.coalesce(db.func.max(CategoriaFigura.orden), 0)).scalar()
    categoria = CategoriaFigura(nombre=_nombre_valido(data.get("nombre")), orden=(ultima or 0) + 1)
    db.session.add(categoria)
    db.session.commit()
    return categoria


def actualizar_categoria(id_categoria, data):
    """Renombrar actualiza también las figuras que tenían la categoría."""
    categoria = obtener_o_404(CategoriaFigura, id_categoria, "Categoría no encontrada")
    nuevo = _nombre_valido(data.get("nombre"), id_actual=categoria.id)
    if nuevo != categoria.nombre:
        Producto.query.filter(Producto.categoria == categoria.nombre).update(
            {Producto.categoria: nuevo}, synchronize_session=False
        )
        categoria.nombre = nuevo
    db.session.commit()
    return categoria


def eliminar_categoria(id_categoria):
    """Las figuras de la categoría quedan sin categoría."""
    categoria = obtener_o_404(CategoriaFigura, id_categoria, "Categoría no encontrada")
    Producto.query.filter(Producto.categoria == categoria.nombre).update(
        {Producto.categoria: None}, synchronize_session=False
    )
    db.session.delete(categoria)
    db.session.commit()
