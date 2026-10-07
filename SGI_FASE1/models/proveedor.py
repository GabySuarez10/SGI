from database import db


class Proveedor(db.Model):
    """Tabla Proveedor. La llave primaria es el nombre."""

    __tablename__ = "proveedor"

    nombre = db.Column("nombre", db.String(100), primary_key=True)
    telefono = db.Column("telefono", db.String(100))
    direccion = db.Column("dirección", db.String(100))
    ciudad = db.Column("ciudad", db.String(100))
    descripcion = db.Column("descripción", db.Text)

    def to_dict(self):
        return {
            "nombre": self.nombre,
            "telefono": self.telefono,
            "direccion": self.direccion,
            "ciudad": self.ciudad,
            "descripcion": self.descripcion,
        }
