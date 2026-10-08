from database import db
from models import Proveedor, Producto, InventarioBodega, InventarioLocal, PedidoProveedor
from queries.comunes import obtener_o_404, entero
from utils.errores import ErrorAPI

CAMPOS = ("telefono", "direccion", "ciudad", "descripcion")


def _limite(valor):
    """Precio máximo por figura pactado con el proveedor. Vacío o 0 = sin límite."""
    if valor in (None, "", 0, "0"):
        return None
    return entero(valor, "límite de precio", 1)


TIPOS_PROVEEDOR = ("figuras", "materiales", "ambos")


def _tipo(valor):
    """figuras | materiales (pinturas, pinceles y otros) | ambos"""
    tipo = (valor or "figuras").strip().lower()
    if tipo not in TIPOS_PROVEEDOR:
        raise ErrorAPI("El tipo de proveedor debe ser 'figuras', 'materiales' o 'ambos'")
    return tipo


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

    proveedor = Proveedor(
        nombre=nombre,
        limite_precio=_limite(data.get("limite_precio")),
        tipo=_tipo(data.get("tipo")),
        **{c: data.get(c) for c in CAMPOS},
    )
    db.session.add(proveedor)
    db.session.commit()
    return proveedor


def actualizar_proveedor(nombre_actual, data):
    proveedor = obtener_proveedor(nombre_actual)

    for campo in CAMPOS:
        if campo in data:
            setattr(proveedor, campo, data[campo])
    if "limite_precio" in data:
        proveedor.limite_precio = _limite(data["limite_precio"])
    if "tipo" in data:
        proveedor.tipo = _tipo(data["tipo"])

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
            f"No se puede eliminar: el proveedor tiene {productos} producto(s) registrados. "
            "Elimina o cambia de proveedor esos productos primero.",
            409,
        )
    pendientes = PedidoProveedor.query.filter(
        PedidoProveedor.proveedor == nombre, PedidoProveedor.estado.is_(False)
    ).count()
    if pendientes:
        raise ErrorAPI(
            f"No se puede eliminar: el proveedor tiene {pendientes} pedido(s) pendiente(s)",
            409,
        )
    db.session.delete(proveedor)
    db.session.commit()
