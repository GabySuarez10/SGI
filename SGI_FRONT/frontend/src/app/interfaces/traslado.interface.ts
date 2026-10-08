// En la base de datos los productos y cantidades se guardan como texto
// separado por comas; la API los entrega como LISTAS con el mismo orden.
// bodega_local: de bodega al local · local_bodega: del local a bodega
export type SentidoTraslado = 'bodega_local' | 'local_bodega';

export interface ITraslado {
  codigo: number;
  producto: string[];
  cantidad: number[];
  fecha: string;
  sentido: SentidoTraslado;
}

export interface ITrasladoNuevo {
  producto: string[];
  cantidad: number[];
  sentido: SentidoTraslado;
  fecha?: string;
}
