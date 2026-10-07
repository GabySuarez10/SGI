from database import db


class Usuario(db.Model):
    """Tabla Usuarios (id, nombre, contrasena)."""

    __tablename__ = "usuarios"

    id = db.Column("id", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.String(100))
    contrasena = db.Column("contrasena", db.String(100))

    def to_dict(self):
        # La contraseña nunca se devuelve al front
        return {
            "id": self.id,
            "nombre": self.nombre,
        }
