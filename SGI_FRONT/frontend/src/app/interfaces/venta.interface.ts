// producto[i] se vendió en cantidad[i] unidades a precio_unitario[i]
export interface IVenta {
  codigo: number;
  producto: string[];
  cantidad: number[];
  precio_unitario: number[];
  total: number;
  fecha: string;
  cliente: string;
  observacion: string;
  usuario: string;
}

export interface IVentaNueva {
  producto: string[];
  cantidad: number[];
  precio_unitario: number[];
  cliente: string;
  observacion: string;
  usuario: string;
  fecha?: string;
}
