"""
Colecciones de pinturas (Acrílicas, Pátinas, Metalizados, Bases, Gamusa...).
Cada tono de una colección es un producto de tipo "pintura" con coleccion = nombre.
"""

from database import db
from models import ColeccionMaterial, Producto
from queries.comunes import obtener_o_404
from utils.errores import ErrorAPI


def listar_colecciones():
    """Colecciones con la cantidad de tonos (productos) que tiene cada una."""
    conteo = dict(
        db.session.query(Producto.coleccion, db.func.count(Producto.codigo))
        .filter(Producto.tipo == "pintura")
        .group_by(Producto.coleccion)
        .all()
    )
    resultado = []
    for coleccion in ColeccionMaterial.query.order_by(ColeccionMaterial.orden, ColeccionMaterial.nombre):
        item = coleccion.to_dict()
        item["tonos"] = conteo.get(coleccion.nombre, 0)
        resultado.append(item)
    return resultado


def _nombre_valido(nombre, id_actual=None):
    nombre = (nombre or "").strip()
    if not nombre:
        raise ErrorAPI("Escribe el nombre de la colección")
    if "," in nombre:
        raise ErrorAPI("El nombre de la colección no puede contener comas (,)")
    otra = ColeccionMaterial.query.filter(db.func.lower(ColeccionMaterial.nombre) == nombre.lower()).first()
    if otra and otra.id != id_actual:
        raise ErrorAPI(f"Ya existe la colección '{nombre}'", 409)
    return nombre[:60]


def crear_coleccion(data):
    """{ nombre, descripcion? }"""
    ultima = db.session.query(db.func.coalesce(db.func.max(ColeccionMaterial.orden), 0)).scalar()
    coleccion = ColeccionMaterial(
        nombre=_nombre_valido(data.get("nombre")),
        descripcion=(data.get("descripcion") or "").strip(),
        orden=(ultima or 0) + 1,
    )
    db.session.add(coleccion)
    db.session.commit()
    return coleccion


def actualizar_coleccion(id_coleccion, data):
    """Renombrar actualiza también la colección de sus pinturas."""
    coleccion = obtener_o_404(ColeccionMaterial, id_coleccion, "Colección no encontrada")
    if "nombre" in data:
        nuevo = _nombre_valido(data["nombre"], id_actual=coleccion.id)
        if nuevo != coleccion.nombre:
            Producto.query.filter(Producto.coleccion == coleccion.nombre).update(
                {Producto.coleccion: nuevo}, synchronize_session=False
            )
            coleccion.nombre = nuevo
    if "descripcion" in data:
        coleccion.descripcion = (data["descripcion"] or "").strip()
    db.session.commit()
    return coleccion


def eliminar_coleccion(id_coleccion):
    coleccion = obtener_o_404(ColeccionMaterial, id_coleccion, "Colección no encontrada")
    tonos = Producto.query.filter(Producto.coleccion == coleccion.nombre).count()
    if tonos:
        raise ErrorAPI(f"No se puede eliminar: la colección tiene {tonos} tono(s) registrados", 409)
    db.session.delete(coleccion)
    db.session.commit()
