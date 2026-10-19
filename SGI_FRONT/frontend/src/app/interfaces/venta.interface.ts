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
  modalidad: string;
  medios_pago: string[];     // cómo se pagó (pago mixto: varios)
  valores_pago: number[];
  recibido: number | null;   // efectivo que entregó el cliente
  caja: number | null;
}

export interface IVentaNueva {
  producto: string[];
  cantidad: number[];
  precio_unitario: number[];
  cliente: string;
  observacion: string;
  usuario: string;
  modalidad: string;
  fecha?: string;
  pagos?: { medio: string; valor: number }[];
  recibido?: number | null;
}

// Pinturas y pinceles reservados para armar kits (productos KIT-PINTURAS y KIT-PINCELES)
export interface IMaterialKit {
  existe: boolean;
  codigo: number | null;
  nombre: string;     // "Pinturas para kits" / "Pinceles para kits"
  local: number;      // se usan en "Kit para llevar"
  bodega: number;     // se usan en "Empresa con contrato"
}

export interface IMaterialesKits {
  'KIT-PINTURAS': IMaterialKit;
  'KIT-PINCELES': IMaterialKit;
}

// Referencias fijas de los materiales de los kits
export const REF_PINTURAS_KIT = 'KIT-PINTURAS';
export const REF_PINCELES_KIT = 'KIT-PINCELES';

export function esMaterialDeKit(referencia: string | null | undefined): boolean {
  const ref = (referencia ?? '').toUpperCase();
  return ref === REF_PINTURAS_KIT || ref === REF_PINCELES_KIT;
}
