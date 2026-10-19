// 'pos' = documento equivalente POS (tirilla) · 'electronica' = factura electrónica de venta
export type TipoFactura = 'pos' | 'electronica';

// pendiente_envio = aún no validada por la DIAN (falta el proveedor tecnológico)
export type EstadoFactura = 'pendiente_envio' | 'aceptada' | 'rechazada' | 'anulada';

export interface IClienteFactura {
  tipo_documento: string;   // CC, NIT, CE, TI, PP, PEP, PPT, NIT_EXT...
  documento: string;        // 222222222222 = consumidor final
  nombre: string;
  correo: string;
  direccion: string;
  telefono: string;
}

export interface ILineaFactura {
  codigo: string;           // referencia del producto
  descripcion: string;
  cantidad: number;
  unidad: string;           // UND
  valor_unitario: number;
  base: number;             // valor sin IVA
  tarifa_iva: number;       // 19, 5, 0
  iva: number;
  total: number;
}

export interface IResolucionDian {
  numero: string;
  fecha: string;
  prefijo: string;
  desde: number;
  hasta: number | null;
  vigencia_hasta: string;
  completa: boolean;
}

// Copia de los datos del negocio guardada en la factura
export interface IEmisorFactura {
  denominacion: string;
  razon_social: string;
  nombre_comercial: string;
  tipo_persona: string;
  nit: string;
  dv: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string;
  correo: string;
  actividad_economica: string;
  responsable_iva: boolean;
  calidades: string[];
  resolucion: IResolucionDian;
  caja: string;
  software: { nombre: string; fabricante: string; nit: string; proveedor_tecnologico: string };
  ancho_tirilla: string;
  mensaje_pie: string;
  politica_cambios: string;
}

export interface IFactura {
  codigo: number;
  venta: number | null;
  tipo: TipoFactura;
  prefijo: string;
  numero: number;
  numero_completo: string;  // prefijo + número, ej. POS125
  fecha: string;
  fecha_vencimiento: string | null;
  cliente: IClienteFactura;
  forma_pago: string;       // Contado | Crédito
  medio_pago: string;       // Efectivo, Tarjeta débito...
  recibido: number | null;
  cambio: number;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  detalle: ILineaFactura[];
  emisor: IEmisorFactura;
  cufe: string;             // CUFE (factura) o CUDE (POS) cuando la DIAN la valida
  estado: EstadoFactura;
  observaciones: string;
  usuario: string;
}

export interface IFacturaNueva {
  venta: number;
  tipo: TipoFactura;
  cliente?: Partial<IClienteFactura>;
  forma_pago: string;
  dias_credito?: number;
  medio_pago: string;
  recibido?: number | null;
  observaciones?: string;
  usuario?: string;
}

// Datos del negocio para facturar (clave -> texto)
export type IDatosFacturacion = Record<string, string>;

export interface IOpcionesFacturacion {
  tipos: { valor: TipoFactura; nombre: string }[];
  tipos_documento: string[];
  formas_pago: string[];
  medios_pago: string[];
  consumidor_final: { tipo_documento: string; documento: string; nombre: string };
}

export interface IRespuestaDatosFacturacion {
  datos: IDatosFacturacion;
  opciones: IOpcionesFacturacion;
}
