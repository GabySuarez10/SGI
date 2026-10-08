from database import db
from utils.fechas import a_texto
from utils.listas import texto_a_lista, texto_a_lista_numeros


class Venta(db.Model):
    """
    Tabla Venta.

    producto, cantidad y precio_unitario se guardan como texto separado por
    comas y se devuelven como LISTAS que conservan el mismo orden:
        producto[i] se vendió en cantidad[i] unidades a precio_unitario[i].
    """

    __tablename__ = "venta"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    producto = db.Column("producto", db.Text)
    cantidad = db.Column("cantidad", db.Text)
    precio_unitario = db.Column("precio_unitario", db.Text)
    total = db.Column("total", db.Integer)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())
    cliente = db.Column("cliente", db.Text)
    observacion = db.Column("observacion", db.Text)
    usuario = db.Column("usuario", db.String(100))
    modalidad = db.Column("modalidad", db.String(40))

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "producto": texto_a_lista(self.producto),
            "cantidad": texto_a_lista_numeros(self.cantidad),
            "precio_unitario": texto_a_lista_numeros(self.precio_unitario),
            "total": self.total or 0,
            "fecha": a_texto(self.fecha),
            "cliente": self.cliente,
            "observacion": self.observacion,
            "usuario": self.usuario,
            "modalidad": self.modalidad or "",
        }
