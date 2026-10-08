"""
Modelos (clases) que representan cada tabla de la base de datos en Neon.
Equivale a la carpeta "Classes" del repositorio de referencia.
"""

from models.usuario import Usuario
from models.proveedor import Proveedor
from models.producto import Producto
from models.inventario_bodega import InventarioBodega
from models.inventario_local import InventarioLocal
from models.venta import Venta
from models.traslado import Traslado
from models.pedido_proveedor import PedidoProveedor
from models.configuracion import TarifaEnvio, Configuracion
from models.coleccion_material import ColeccionMaterial
from models.categoria_figura import CategoriaFigura

__all__ = [
    "Usuario",
    "Proveedor",
    "Producto",
    "InventarioBodega",
    "InventarioLocal",
    "Venta",
    "Traslado",
    "PedidoProveedor",
    "TarifaEnvio",
    "Configuracion",
    "ColeccionMaterial",
    "CategoriaFigura",
]
