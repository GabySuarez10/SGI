from database import db
from models import Proveedor, Producto, InventarioBodega, InventarioLocal, PedidoProveedor
from queries.comunes import obtener_o_404
from utils.errores import ErrorAPI

CAMPOS = ("telefono", "direccion", "ciudad", "descripcion")


def listar_proveedores():
    return Proveedor.query.order_by(Proveedor.nombre).all()


def obtener_proveedor(nombre):
    return obtener_o_404(Proveedor, nombre, f"Proveedor '{nombre}' no encontrado")


def crear_proveedor(data):
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        raise ErrorAPI("El campo nombre es obligatorio")
    if db.session.get(Proveedor, nombre):
        raise ErrorAPI(f"Ya existe un proveedor con el nombre '{nombre}'", 409)

    proveedor = Proveedor(nombre=nombre, **{c: data.get(c) for c in CAMPOS})
    db.session.add(proveedor)
    db.session.commit()
    return proveedor


def actualizar_proveedor(nombre_actual, data):
    proveedor = obtener_proveedor(nombre_actual)

    for campo in CAMPOS:
        if campo in data:
            setattr(proveedor, campo, data[campo])

    # Cambio de nombre: como el nombre es la llave y los productos, inventarios
    # y pedidos guardan el nombre del proveedor como texto, se actualiza en todas
    # las tablas dentro de la misma transacción.
    nuevo_nombre = (data.get("nombre") or nombre_actual).strip()
    if nuevo_nombre != nombre_actual:
        if db.session.get(Proveedor, nuevo_nombre):
            raise ErrorAPI(f"Ya existe un proveedor con el nombre '{nuevo_nombre}'", 409)
        proveedor.nombre = nuevo_nombre
        for modelo in (Producto, InventarioBodega, InventarioLocal, PedidoProveedor):
            modelo.query.filter(modelo.proveedor == nombre_actual).update(
                {modelo.proveedor: nuevo_nombre}, synchronize_session=False
            )

    db.session.commit()
    return proveedor


def eliminar_proveedor(nombre):
    proveedor = obtener_proveedor(nombre)
    productos = Producto.query.filter(Producto.proveedor == nombre).count()
    if productos:
        raise ErrorAPI(
            f"No se puede eliminar: el proveedor tiene {productos} producto(s) registrados",
            409,
        )
    db.session.delete(proveedor)
    db.session.commit()
