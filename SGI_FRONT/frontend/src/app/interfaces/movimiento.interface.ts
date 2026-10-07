export type TipoMovimiento =
  | 'Venta / Salida'
  | 'Traslado'
  | 'Pedido a proveedor';

export interface IMovimiento {
  tipo: TipoMovimiento;
  codigo: string;
  producto: string;
  cantidad: number;
  origen: string;
  destino: string;
  fecha: string;
  estado: string;
}
