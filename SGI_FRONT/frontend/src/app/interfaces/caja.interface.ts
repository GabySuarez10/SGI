// Medios de pago que recibe Pintarte (deben coincidir con caja_queries.py)
export type MedioPago = 'Efectivo' | 'Nequi / Daviplata' | 'Transferencia bancaria' | 'Tarjeta';

export const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Nequi / Daviplata', 'Transferencia bancaria', 'Tarjeta'];

export const DENOMINACIONES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

export interface IPagoVenta {
  medio: MedioPago;
  valor: number;
}

export interface IMovimientoCaja {
  codigo: number;
  caja: number;
  fecha: string;
  tipo: 'entrada' | 'salida';
  valor: number;
  motivo: string;
  categoria: string;
  usuario: string;
}

export interface IResumenCaja {
  ventas: number;
  total_ventas: number;
  por_medio: { medio: string; valor: number; pagos: number }[];
  sin_registrar: { ventas: number; total: number };
  no_efectivo: { venta: number; hora: string; medio: string; valor: number; cliente: string }[];
  movimientos: IMovimientoCaja[];
  entradas: number;
  salidas: number;
  efectivo_esperado: number;
}

export interface ICaja {
  codigo: number;
  fecha: string;
  base: number;
  abierta_por: string;
  hora_apertura: string;
  estado: 'abierta' | 'cerrada';
  efectivo_esperado: number | null;
  efectivo_contado: number | null;
  diferencia: number | null;
  conteo: Record<string, number> | null;   // billetes y monedas contados
  resumen: IResumenCaja | null;            // foto del resumen al cerrar
  cerrada_por: string;
  hora_cierre: string | null;
  observaciones: string;
  resumen_actual?: IResumenCaja;           // resumen calculado ahora
}

export interface IOpcionesCaja {
  medios_pago: MedioPago[];
  denominaciones: number[];
  categorias: { entrada: string[]; salida: string[] };
}

export interface ICajaHoy {
  caja: ICaja | null;
  opciones: IOpcionesCaja;
}
