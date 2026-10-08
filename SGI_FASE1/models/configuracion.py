from database import db


class TarifaEnvio(db.Model):
    """Precio de envío según el tamaño de la figura (Mini, Pequeño, ...)."""

    __tablename__ = "tarifa_envio"

    id = db.Column("id", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.String(40), nullable=False, unique=True)
    precio = db.Column("precio", db.Integer, nullable=False, default=0)
    orden = db.Column("orden", db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre, "precio": self.precio or 0, "orden": self.orden or 0}


class Configuracion(db.Model):
    """Valores generales editables (multiplicador de precio, precio de kit por contrato...)."""

    __tablename__ = "configuracion"

    clave = db.Column("clave", db.String(60), primary_key=True)
    valor = db.Column("valor", db.Integer, nullable=False, default=0)
    descripcion = db.Column("descripcion", db.Text)

    def to_dict(self):
        return {"clave": self.clave, "valor": self.valor or 0, "descripcion": self.descripcion or ""}
