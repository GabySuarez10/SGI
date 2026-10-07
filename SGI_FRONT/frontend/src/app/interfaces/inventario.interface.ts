export interface IInventarioBodega {
  codigo: number;
  nombre: string;
  imagen: string;
  proveedor: string;
  tamano: string;
  descripcion: string;
  costo: number;
  existencias: number;
}

export interface IInventarioLocal {
  codigo: number;
  nombre: string;
  imagen: string;
  proveedor: string;
  tamano: string;
  existencias: number;
  precio_venta: number;
  precio_mayorista: number;
}
