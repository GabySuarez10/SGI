from database import db


class InventarioBodega(db.Model):
    """
    Existencias en la bodega (tabla Inventario_bodega).
    codigo coincide con Producto.codigo.
    """

    __tablename__ = "inventario_bodega"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(20))
    descripcion = db.Column("descripcion", db.Text)
    costo = db.Column("costo", db.Integer)
    existencias = db.Column("existencias", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "descripcion": self.descripcion,
            "costo": self.costo,
            "existencias": self.existencias or 0,
        }
