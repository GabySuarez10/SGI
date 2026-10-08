from database import db


class CategoriaFigura(db.Model):
    """Categoría para agrupar y filtrar figuras (Navidad, Materas, Juveniles, ...)."""

    __tablename__ = "categoria_figura"

    id = db.Column("id", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.String(40), nullable=False, unique=True)
    orden = db.Column("orden", db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre, "orden": self.orden or 0}
