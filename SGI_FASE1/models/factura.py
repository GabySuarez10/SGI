import json

from database import db
from utils.fechas import a_texto


class DatosFacturacion(db.Model):
    """
    Datos del negocio para facturar (clave -> valor): NIT, razón social,
    resolución de numeración DIAN, IVA, software... Se editan en Configuración.
    """

    __tablename__ = "datos_facturacion"

    clave = db.Column("clave", db.String(60), primary_key=True)
    valor = db.Column("valor", db.Text)


class Factura(db.Model):
    """
    Factura de una venta.
      tipo = 'pos'         -> documento equivalente POS (tirilla)
             'electronica' -> factura electrónica de venta
    detalle y emisor se guardan como JSON: copia de lo facturado y de los datos
    del negocio en ese momento, para reimprimirla siempre igual.
    """

    __tablename__ = "factura"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    venta = db.Column("venta", db.Integer)
    tipo = db.Column("tipo", db.String(20), nullable=False, default="pos")
    prefijo = db.Column("prefijo", db.String(10), nullable=False, default="")
    numero = db.Column("numero", db.Integer, nullable=False)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())
    fecha_vencimiento = db.Column("fecha_vencimiento", db.Date)
    cliente_tipo_documento = db.Column("cliente_tipo_documento", db.String(10))
    cliente_documento = db.Column("cliente_documento", db.String(30))
    cliente_nombre = db.Column("cliente_nombre", db.Text)
    cliente_correo = db.Column("cliente_correo", db.Text)
    cliente_direccion = db.Column("cliente_direccion", db.Text)
    cliente_telefono = db.Column("cliente_telefono", db.String(40))
    forma_pago = db.Column("forma_pago", db.String(20), default="Contado")
    medio_pago = db.Column("medio_pago", db.String(30), default="Efectivo")
    recibido = db.Column("recibido", db.Integer)
    subtotal = db.Column("subtotal", db.Integer, nullable=False, default=0)
    descuento = db.Column("descuento", db.Integer, nullable=False, default=0)
    iva = db.Column("iva", db.Integer, nullable=False, default=0)
    total = db.Column("total", db.Integer, nullable=False, default=0)
    detalle = db.Column("detalle", db.Text)
    emisor = db.Column("emisor", db.Text)
    cufe = db.Column("cufe", db.String(120))
    estado = db.Column("estado", db.String(30), nullable=False, default="pendiente_envio")
    observaciones = db.Column("observaciones", db.Text)
    usuario = db.Column("usuario", db.String(100))

    @property
    def numero_completo(self):
        return f"{self.prefijo or ''}{self.numero}"

    def to_dict(self):
        def _json(texto, vacio):
            try:
                return json.loads(texto) if texto else vacio
            except (TypeError, ValueError):
                return vacio

        return {
            "codigo": self.codigo,
            "venta": self.venta,
            "tipo": self.tipo,
            "prefijo": self.prefijo or "",
            "numero": self.numero,
            "numero_completo": self.numero_completo,
            "fecha": a_texto(self.fecha),
            "fecha_vencimiento": self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            "cliente": {
                "tipo_documento": self.cliente_tipo_documento or "",
                "documento": self.cliente_documento or "",
                "nombre": self.cliente_nombre or "",
                "correo": self.cliente_correo or "",
                "direccion": self.cliente_direccion or "",
                "telefono": self.cliente_telefono or "",
            },
            "forma_pago": self.forma_pago or "Contado",
            "medio_pago": self.medio_pago or "Efectivo",
            "recibido": self.recibido,
            "cambio": max((self.recibido or 0) - (self.total or 0), 0) if self.recibido else 0,
            "subtotal": self.subtotal or 0,
            "descuento": self.descuento or 0,
            "iva": self.iva or 0,
            "total": self.total or 0,
            "detalle": _json(self.detalle, []),
            "emisor": _json(self.emisor, {}),
            "cufe": self.cufe or "",
            "estado": self.estado,
            "observaciones": self.observaciones or "",
            "usuario": self.usuario or "",
        }
