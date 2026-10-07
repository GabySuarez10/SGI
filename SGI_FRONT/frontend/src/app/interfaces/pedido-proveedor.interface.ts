// Todas las columnas tipo lista conservan la misma posición:
// productos[i] -> cantidad[i], precio_esperado[i], llegan[i], ...
export interface IPedidoProveedor {
  codigo: number;
  proveedor: string;
  productos: string[];
  cantidad: number[];
  precio_esperado: number[];
  llegan: number[];
  sobran: number[];
  faltan: number[];
  danados: number[];
  precio_total: number;
  fecha_pedido: string;
  fecha_llegada: string | null;
  estado: boolean;        // false = pendiente, true = recibido
  zona_entrega: boolean;  // true = Bodega, false = Local
}

export interface IPedidoNuevo {
  proveedor: string;
  productos: string[];
  cantidad: number[];
  precio_esperado: number[];
  fecha_pedido: string;
  zona_entrega: boolean;
}

export interface IRecepcionPedido {
  llegan: number[];
  danados: number[];
}
