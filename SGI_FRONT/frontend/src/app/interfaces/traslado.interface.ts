// En la base de datos los productos y cantidades se guardan como texto
// separado por comas; la API los entrega como LISTAS con el mismo orden.
export interface ITraslado {
  codigo: number;
  producto: string[];
  cantidad: number[];
  fecha: string;
}

export interface ITrasladoNuevo {
  producto: string[];
  cantidad: number[];
  fecha?: string;
}
