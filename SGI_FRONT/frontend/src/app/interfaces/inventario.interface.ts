import { TipoProducto } from '../utils/tipos';

export interface IInventarioBodega {
  codigo: number;
  nombre: string;
  imagen: string;
  proveedor: string;
  tamano: string;
  descripcion: string;
  costo: number;
  existencias: number;
  tipo: TipoProducto;     // del catálogo
  coleccion: string;
  referencia: string;
  categoria: string;      // solo figuras
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
  tipo: TipoProducto;     // del catálogo
  coleccion: string;
  referencia: string;
  categoria: string;      // solo figuras
}
