from database import db
from utils.fechas import a_texto
from utils.listas import texto_a_lista, texto_a_lista_numeros


class Traslado(db.Model):
    """
    Tabla Traslado: historial de movimientos entre BODEGA y LOCAL (en ambos sentidos).

    producto y cantidad son listas con correspondencia posicional:
        producto[i] -> cantidad[i] unidades trasladadas.
    """

    __tablename__ = "traslado"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    producto = db.Column("producto", db.Text)
    cantidad = db.Column("cantidad", db.Text)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())
    # bodega_local (de bodega al local) | local_bodega (del local a bodega)
    sentido = db.Column("sentido", db.String(20), default="bodega_local")

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "producto": texto_a_lista(self.producto),
            "cantidad": texto_a_lista_numeros(self.cantidad),
            "fecha": a_texto(self.fecha),
            "sentido": self.sentido or "bodega_local",
        }
