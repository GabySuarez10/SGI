from database import db


class Proveedor(db.Model):
    """Tabla Proveedor. La llave primaria es el nombre."""

    __tablename__ = "proveedor"

    nombre = db.Column("nombre", db.String(100), primary_key=True)
    telefono = db.Column("telefono", db.String(100))
    direccion = db.Column("dirección", db.String(100))
    ciudad = db.Column("ciudad", db.String(100))
    descripcion = db.Column("descripción", db.Text)
    # Precio máximo pactado por figura (None = sin límite)
    limite_precio = db.Column("limite_precio", db.Integer, nullable=True)
    # figuras | materiales (pinturas, pinceles y otros) | ambos
    tipo = db.Column("tipo", db.String(20), default="figuras")

    def to_dict(self):
        return {
            "nombre": self.nombre,
            "telefono": self.telefono,
            "direccion": self.direccion,
            "ciudad": self.ciudad,
            "descripcion": self.descripcion,
            "limite_precio": self.limite_precio,
            "tipo": self.tipo or "figuras",
        }
