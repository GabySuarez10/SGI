from database import db
from utils.fechas import a_texto
from utils.listas import texto_a_lista, texto_a_lista_numeros


class Traslado(db.Model):
    """
    Tabla Traslado: historial de movimientos de BODEGA hacia el LOCAL.

    producto y cantidad son listas con correspondencia posicional:
        producto[i] -> cantidad[i] unidades trasladadas.
    """

    __tablename__ = "traslado"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    producto = db.Column("producto", db.Text)
    cantidad = db.Column("cantidad", db.Text)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "producto": texto_a_lista(self.producto),
            "cantidad": texto_a_lista_numeros(self.cantidad),
            "fecha": a_texto(self.fecha),
        }
