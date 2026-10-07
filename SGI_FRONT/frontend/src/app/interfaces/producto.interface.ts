// Producto del catálogo tal como lo devuelve GET /api/productos
export interface IProducto {
  codigo: number;
  referencia: string;
  nombre: string;
  imagen: string;          // URL de la imagen en la nube (se usa en <img [src]>)
  proveedor: string;
  tamano: string;
  descripcion: string;
  costo: number;
  existencias: number;          // bodega + local
  existencias_bodega: number;
  existencias_local: number;
  precio_venta: number;
  precio_mayorista: number;
}

// Datos para crear un producto (POST /api/productos)
export interface IProductoNuevo {
  referencia: string;
  nombre: string;
  tamano: string;
  descripcion: string;
  imagen: string;
  costo: number;
  precio_venta: number;
  precio_mayorista: number;
}

export interface IRegistroProductos {
  proveedor: string;
  productos: IProductoNuevo[];
}
