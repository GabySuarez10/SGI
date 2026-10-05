from routes.usuarios import usuarios_bp
from routes.pedidos_proveedor import pedidos_proveedor_bp
from routes.ventas import ventas_bp
from routes.proveedores import proveedores_bp
from routes.traslados import traslados_bp
from routes.inventario_local import inventario_local_bp
from routes.productos import productos_bp
from routes.inventario_bodega import inventario_bodega_bp


def register_blueprints(app):
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(pedidos_proveedor_bp)
    app.register_blueprint(ventas_bp)
    app.register_blueprint(proveedores_bp)
    app.register_blueprint(traslados_bp)
    app.register_blueprint(inventario_local_bp)
    app.register_blueprint(productos_bp)
    app.register_blueprint(inventario_bodega_bp)
