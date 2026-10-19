import json

from database import db
from utils.fechas import a_texto


class Caja(db.Model):
    """Caja de un día: apertura con la base y cierre con el conteo del efectivo."""

    __tablename__ = "caja"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    fecha = db.Column("fecha", db.Date, nullable=False, unique=True)
    base = db.Column("base", db.Integer, nullable=False, default=0)
    abierta_por = db.Column("abierta_por", db.String(100))
    hora_apertura = db.Column("hora_apertura", db.DateTime, server_default=db.func.now())
    estado = db.Column("estado", db.String(20), nullable=False, default="abierta")
    efectivo_esperado = db.Column("efectivo_esperado", db.Integer)
    efectivo_contado = db.Column("efectivo_contado", db.Integer)
    diferencia = db.Column("diferencia", db.Integer)
    conteo = db.Column("conteo", db.Text)
    resumen = db.Column("resumen", db.Text)
    cerrada_por = db.Column("cerrada_por", db.String(100))
    hora_cierre = db.Column("hora_cierre", db.DateTime)
    observaciones = db.Column("observaciones", db.Text)

    def to_dict(self):
        def _json(texto):
            try:
                return json.loads(texto) if texto else None
            except (TypeError, ValueError):
                return None

        return {
            "codigo": self.codigo,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "base": self.base or 0,
            "abierta_por": self.abierta_por or "",
            "hora_apertura": a_texto(self.hora_apertura),
            "estado": self.estado,
            "efectivo_esperado": self.efectivo_esperado,
            "efectivo_contado": self.efectivo_contado,
            "diferencia": self.diferencia,
            "conteo": _json(self.conteo),
            "resumen": _json(self.resumen),
            "cerrada_por": self.cerrada_por or "",
            "hora_cierre": a_texto(self.hora_cierre),
            "observaciones": self.observaciones or "",
        }


class MovimientoCaja(db.Model):
    """Entrada o salida de efectivo que no es una venta (pago a proveedor, retiro...)."""

    __tablename__ = "movimiento_caja"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    caja = db.Column("caja", db.Integer, nullable=False)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())
    tipo = db.Column("tipo", db.String(10), nullable=False)
    valor = db.Column("valor", db.Integer, nullable=False)
    motivo = db.Column("motivo", db.Text, nullable=False)
    categoria = db.Column("categoria", db.String(40))
    usuario = db.Column("usuario", db.String(100))

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "caja": self.caja,
            "fecha": a_texto(self.fecha),
            "tipo": self.tipo,
            "valor": self.valor or 0,
            "motivo": self.motivo or "",
            "categoria": self.categoria or "",
            "usuario": self.usuario or "",
        }
