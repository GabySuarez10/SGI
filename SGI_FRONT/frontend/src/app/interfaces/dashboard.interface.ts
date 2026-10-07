import { IMovimiento } from './movimiento.interface';
import { IPedidoProveedor } from './pedido-proveedor.interface';

export interface IAlerta {
  nivel: 'warning' | 'danger';
  titulo: string;
  mensaje: string;
}

export interface IResumenDashboard {
  total_productos: number;
  unidades_bodega: number;
  unidades_local: number;
  pedidos_pendientes: number;
  pedidos_recientes: IPedidoProveedor[];
  alertas: IAlerta[];
  actividad_reciente: IMovimiento[];
}
