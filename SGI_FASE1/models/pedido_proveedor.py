from database import db
from utils.fechas import a_texto
from utils.listas import texto_a_lista, texto_a_lista_numeros


class PedidoProveedor(db.Model):
    """
    Tabla Pedido_proveedor. Cada pedido tiene un único proveedor.

    Columnas que son LISTAS (misma posición = mismo producto):
        productos        nombres de los productos pedidos
        cantidad         unidades solicitadas
        precio_esperado  precio unitario esperado
        llegan           unidades recibidas (incluye las dañadas)
        sobran           recibidas por encima de lo solicitado
        faltan           solicitadas que no llegaron
        danados          dañadas (subconjunto de las que llegaron)
        facturado        unidades que dice la factura del proveedor
        precio_factura   precio unitario cobrado en la factura

    estado        False = pendiente, True = recibido
    zona_entrega  True = se recibe en la BODEGA, False = se recibe en el LOCAL
    """

    __tablename__ = "pedido_proveedor"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    proveedor = db.Column("proveedor", db.String(100))
    productos = db.Column("productos", db.Text)
    cantidad = db.Column("cantidad", db.Text)
    precio_esperado = db.Column("precio_esperado", db.Text)
    llegan = db.Column("llegan", db.Text)
    sobran = db.Column("sobran", db.Text)
    faltan = db.Column("faltan", db.Text)
    danados = db.Column("dañados", db.Text)
    facturado = db.Column("facturado", db.Text)
    precio_factura = db.Column("precio_factura", db.Text)
    observaciones = db.Column("observaciones", db.Text)
    precio_total = db.Column("precio_total", db.Integer)
    fecha_pedido = db.Column("fecha_pedido", db.DateTime, server_default=db.func.now())
    fecha_llegada = db.Column("fecha_llegada", db.DateTime, nullable=True)
    estado = db.Column("estado", db.Boolean, default=False)
    zona_entrega = db.Column("zona_entrega", db.Boolean, default=True)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "proveedor": self.proveedor,
            "productos": texto_a_lista(self.productos),
            "cantidad": texto_a_lista_numeros(self.cantidad),
            "precio_esperado": texto_a_lista_numeros(self.precio_esperado),
            "llegan": texto_a_lista_numeros(self.llegan),
            "sobran": texto_a_lista_numeros(self.sobran),
            "faltan": texto_a_lista_numeros(self.faltan),
            "danados": texto_a_lista_numeros(self.danados),
            "facturado": texto_a_lista_numeros(self.facturado),
            "precio_factura": texto_a_lista_numeros(self.precio_factura),
            "observaciones": self.observaciones or "",
            "precio_total": self.precio_total or 0,
            "fecha_pedido": a_texto(self.fecha_pedido),
            "fecha_llegada": a_texto(self.fecha_llegada),
            "estado": bool(self.estado),
            "zona_entrega": bool(self.zona_entrega),
        }
