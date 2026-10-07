"""
Rutas HTTP de la API (Blueprints).
Equivale a la carpeta "Controllers" del repositorio de referencia.
"""

from routes.usuarios import usuarios_bp
from routes.proveedores import proveedores_bp
from routes.productos import productos_bp
from routes.inventario_bodega import inventario_bodega_bp
from routes.inventario_local import inventario_local_bp
from routes.traslados import traslados_bp
from routes.ventas import ventas_bp
from routes.pedidos_proveedor import pedidos_proveedor_bp
from routes.historial import historial_bp

BLUEPRINTS = (
    usuarios_bp,
    proveedores_bp,
    productos_bp,
    inventario_bodega_bp,
    inventario_local_bp,
    traslados_bp,
    ventas_bp,
    pedidos_proveedor_bp,
    historial_bp,
)


def register_blueprints(app):
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
