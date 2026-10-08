from database import db


class InventarioLocal(db.Model):
    """
    Existencias en el local de ventas (tabla Inventario_local).
    codigo coincide con Producto.codigo.
    """

    __tablename__ = "inventario_local"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(60))
    existencias = db.Column("existencias", db.Integer)
    precio_venta = db.Column("precio_venta", db.Integer)
    precio_mayorista = db.Column("precio_mayorista", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "existencias": self.existencias or 0,
            "precio_venta": self.precio_venta or 0,
            "precio_mayorista": self.precio_mayorista or 0,
        }
