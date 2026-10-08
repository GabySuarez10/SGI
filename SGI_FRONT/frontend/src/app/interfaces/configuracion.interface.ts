export interface ITarifaEnvio {
  id?: number;
  nombre: string;     // Mini, Pequeño, Mediano...
  precio: number;     // valor del envío en COP
  orden?: number;
}

// Valores generales editables (tabla configuracion)
export interface IValoresConfiguracion {
  multiplicador_crudo: number;   // precio crudo = fábrica × este valor (4)
  divisor_mayor: number;         // precio por mayor = crudo ÷ este valor (2)
  valor_kit_local: number;       // se suma al precio crudo al vender un kit para llevar
  valor_pintar_local: number;    // se suma al precio crudo si la figura se pinta en el local
  valor_pintada: number;         // adicional sugerido por figura vendida ya pintada
  precio_kit_contrato: number;   // precio por kit para empresas con contrato
  pinturas_por_kit: number;
  pinceles_por_kit: number;
}

export interface IDetalleConfiguracion {
  clave: keyof IValoresConfiguracion;
  valor: number;
  descripcion: string;
}

export interface IConfiguracion {
  valores: IValoresConfiguracion;
  detalle: IDetalleConfiguracion[];
  tarifas_envio: ITarifaEnvio[];
  modalidades_venta: string[];
}

export const VALORES_POR_DEFECTO: IValoresConfiguracion = {
  multiplicador_crudo: 4,
  divisor_mayor: 2,
  valor_kit_local: 2300,
  valor_pintar_local: 3000,
  valor_pintada: 4300,
  precio_kit_contrato: 13000,
  pinturas_por_kit: 5,
  pinceles_por_kit: 1
};
