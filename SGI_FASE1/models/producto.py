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
    tamano = db.Column("tamano", db.String(60))
    descripcion = db.Column("descripcion", db.Text)
    costo = db.Column("costo", db.Integer)              # precio de fábrica
    envio_categoria = db.Column("envio_categoria", db.String(40))
    envio = db.Column("envio", db.Integer, default=0)
    precio_venta = db.Column("precio_venta", db.Integer, default=0)          # crudo + envío
    precio_mayorista = db.Column("precio_mayorista", db.Integer, default=0)  # por mayor + envío
    tipo = db.Column("tipo", db.String(20), default="figura")      # figura | pintura | pincel | otro
    coleccion = db.Column("coleccion", db.String(60))               # solo pinturas
    categoria = db.Column("categoria", db.String(40))               # solo figuras: Navidad, Materas...

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "referencia": self.referencia,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "descripcion": self.descripcion,
            "costo": self.costo or 0,
            "envio_categoria": self.envio_categoria or "",
            "envio": self.envio or 0,
            "precio_venta": self.precio_venta or 0,
            "precio_mayorista": self.precio_mayorista or 0,
            "tipo": self.tipo or "figura",
            "coleccion": self.coleccion or "",
            "categoria": self.categoria or "",
        }
