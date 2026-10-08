from database import db


class ColeccionMaterial(db.Model):
    """Colección de pinturas (Acrílicas, Pátinas, Metalizados, Gamusa...). Cada tono es un producto."""

    __tablename__ = "coleccion_material"

    id = db.Column("id", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.String(60), nullable=False, unique=True)
    descripcion = db.Column("descripcion", db.Text)
    orden = db.Column("orden", db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion or "",
            "orden": self.orden or 0,
        }
