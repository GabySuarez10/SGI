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
  categoria: string;       // categoría de la figura (vacío en materiales)
  tipo_producto: string;   // figura | pintura | pincel | otro
}
