from database import db


class Producto(db.Model):
    """
    Catálogo general de productos (tabla Producto).

    imagen: URL de la imagen alojada en la nube; el front la usa
    directamente en el src de la etiqueta <img>.
    """

    __tablename__ = "producto"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    referencia = db.Column("referencia", db.String(15))
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(20))
    descripcion = db.Column("descripcion", db.Text)
    costo = db.Column("costo", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "referencia": self.referencia,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "descripcion": self.descripcion,
            "costo": self.costo,
        }
