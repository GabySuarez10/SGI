from database import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column("id", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.String(100))
    contrasena = db.Column("contrasena", db.String(100))

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "contrasena": self.contrasena,
        }


class PedidoProveedor(db.Model):
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
    precio_total = db.Column("precio_total", db.Integer)
    fecha_pedido = db.Column("fecha_pedido", db.DateTime, server_default=db.func.now())
    fecha_llegada = db.Column("fecha_llegada", db.DateTime, nullable=True)
    estado = db.Column("estado", db.Boolean, default=False)
    zona_entrega = db.Column("zona_entrega", db.Boolean, default=False)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "proveedor": self.proveedor,
            "productos": self.productos,
            "cantidad": self.cantidad,
            "precio_esperado": self.precio_esperado,
            "llegan": self.llegan,
            "sobran": self.sobran,
            "faltan": self.faltan,
            "danados": self.danados,
            "precio_total": self.precio_total,
            "fecha_pedido": self.fecha_pedido.isoformat() if self.fecha_pedido else None,
            "fecha_llegada": self.fecha_llegada.isoformat() if self.fecha_llegada else None,
            "estado": self.estado,
            "zona_entrega": self.zona_entrega,
        }


class Venta(db.Model):
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

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "producto": self.producto,
            "cantidad": self.cantidad,
            "precio_unitario": self.precio_unitario,
            "total": self.total,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "cliente": self.cliente,
            "observacion": self.observacion,
            "usuario": self.usuario,
        }


class Proveedor(db.Model):
    __tablename__ = "proveedor"

    nombre = db.Column("nombre", db.String(100), primary_key=True)
    telefono = db.Column("telefono", db.String(100))
    direccion = db.Column("dirección", db.String(100))
    ciudad = db.Column("ciudad", db.String(100))
    descripcion = db.Column("descripción", db.Text)

    def to_dict(self):
        return {
            "nombre": self.nombre,
            "telefono": self.telefono,
            "direccion": self.direccion,
            "ciudad": self.ciudad,
            "descripcion": self.descripcion,
        }


class Traslado(db.Model):
    __tablename__ = "traslado"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    producto = db.Column("producto", db.Text)
    cantidad = db.Column("cantidad", db.Text)
    fecha = db.Column("fecha", db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "producto": self.producto,
            "cantidad": self.cantidad,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }


class InventarioLocal(db.Model):
    __tablename__ = "inventario_local"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(20))
    existencias = db.Column("existencias", db.Integer)
    precio_venta = db.Column("precio_venta", db.Integer)
    precio_mayorista = db.Column("precio_mayorista", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "existencias": self.existencias,
            "precio_venta": self.precio_venta,
            "precio_mayorista": self.precio_mayorista,
        }


class Producto(db.Model):
    __tablename__ = "producto"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    referencia = db.Column("referencia", db.String(15))
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(20))
    descripcion = db.Column("descripcion", db.Text)
    costo = db.Column("costo", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "referencia": self.referencia,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "descripcion": self.descripcion,
            "costo": self.costo,
        }


class InventarioBodega(db.Model):
    __tablename__ = "inventario_bodega"

    codigo = db.Column("codigo", db.Integer, primary_key=True)
    nombre = db.Column("nombre", db.Text)
    imagen = db.Column("imagen", db.Text)
    proveedor = db.Column("proveedor", db.String(100))
    tamano = db.Column("tamano", db.String(20))
    descripcion = db.Column("descripcion", db.Text)
    costo = db.Column("costo", db.Integer)
    existencias = db.Column("existencias", db.Integer)

    def to_dict(self):
        return {
            "codigo": self.codigo,
            "nombre": self.nombre,
            "imagen": self.imagen,
            "proveedor": self.proveedor,
            "tamano": self.tamano,
            "descripcion": self.descripcion,
            "costo": self.costo,
            "existencias": self.existencias,
        }
