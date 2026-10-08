import { TipoProducto } from '../utils/tipos';

// Producto del catálogo tal como lo devuelve GET /api/productos
export interface IProducto {
  codigo: number;
  referencia: string;
  nombre: string;
  imagen: string;          // URL de la imagen en la nube (se usa en <img [src]>)
  proveedor: string;
  tamano: string;          // medida en cm (ej. "15 x 10 cm")
  descripcion: string;
  costo: number;           // precio de fábrica
  envio_categoria: string; // Mini, Pequeño, ... o 'Personalizado'
  envio: number;           // valor del envío
  precio_venta: number;    // precio crudo / detal (incluye envío)
  precio_mayorista: number;// precio por mayor (incluye envío)
  tipo: TipoProducto;      // figura | pintura | pincel | otro
  coleccion: string;       // solo pinturas: Acrílicas, Pátinas, Gamusa...
  categoria: string;       // solo figuras: Navidad, Materas, Juveniles...

  // Ubicación y existencias
  en_bodega: boolean;
  en_local: boolean;
  existencias: number;          // bodega + local
  existencias_bodega: number;
  existencias_local: number;

  limite_precio_proveedor: number | null;
}

export type UbicacionProducto = 'bodega' | 'local' | 'ambos';

// Datos para crear un producto (POST /api/productos)
export interface IProductoNuevo {
  referencia: string;
  nombre: string;
  tamano: string;
  descripcion: string;
  imagen: string;
  costo: number;
  envio_categoria: string;
  envio: number;
  precio_venta: number;
  precio_mayorista: number;
  existencias: number;     // unidades con las que entra a la ubicación elegida
  tipo: TipoProducto;
  coleccion: string;
  categoria: string;
}

export interface IRegistroProductos {
  proveedor: string;
  ubicacion: UbicacionProducto;
  productos: IProductoNuevo[];
}

// Datos para editar (PUT /api/productos/:codigo)
export type IProductoEdicion = Partial<Omit<IProducto, 'en_bodega' | 'en_local' | 'existencias'>>;
