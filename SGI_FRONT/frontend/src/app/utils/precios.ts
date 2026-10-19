import { IValoresConfiguracion } from '../interfaces/configuracion.interface';

/*
  Fórmulas de precio de Pintarte:

    precio crudo     = precio de fábrica × 4       + envío
    precio por mayor = (precio de fábrica × 4) ÷ 2 + envío

    pintar en el local = precio crudo × 2           (sugerido, editable)
    figura terminada   = pintar en el local × 2     (sugerido, editable)

  Ejemplo: Oso navidad, fábrica 2.000, sin envío -> crudo 8.000, por mayor 4.000,
  pintar en el local 16.000, terminada 32.000.
  El 4 y el 2 del crudo y por mayor se pueden cambiar en Configuración.
*/

export const FACTOR_PINTAR_LOCAL = 2;   // pintar en el local = crudo × 2
export const FACTOR_TERMINADA = 2;      // terminada = pintar en el local × 2

export function sugeridoPintarLocal(precioCrudo: number): number {
  return (Number(precioCrudo) || 0) * FACTOR_PINTAR_LOCAL;
}

export function sugeridoTerminada(precioPintarLocal: number): number {
  return (Number(precioPintarLocal) || 0) * FACTOR_TERMINADA;
}
export function calcularPrecios(
  costo: number,
  envio: number,
  valores: Pick<IValoresConfiguracion, 'multiplicador_crudo' | 'divisor_mayor'>
): { crudo: number; mayor: number } {
  const fabrica = Number(costo) || 0;
  const valorEnvio = Number(envio) || 0;
  const crudoBase = fabrica * (Number(valores.multiplicador_crudo) || 0);
  const mayorBase = Math.round(crudoBase / (Number(valores.divisor_mayor) || 1));
  return {
    crudo: crudoBase + valorEnvio,
    mayor: mayorBase + valorEnvio
  };
}

// Modalidades de venta (deben coincidir con utils/precios.py del backend)
export type ModalidadVenta =
  | 'Detal'
  | 'Pintar en el local'
  | 'Kit para llevar'
  | 'Pintada'
  | 'Por mayor (local)'
  | 'Empresa por mayor'
  | 'Empresa con contrato';

export const MODALIDADES_VENTA: { valor: ModalidadVenta; descripcion: string; icono: string }[] = [
  { valor: 'Detal', descripcion: 'Figura en crudo (yeso blanco) para pintar', icono: '🏺' },
  { valor: 'Pintar en el local', descripcion: 'Figura + pinturas y técnica para pintarla en el local', icono: '🖌️' },
  { valor: 'Kit para llevar', descripcion: 'Figura + 5 pinturas + 1 pincel para pintar en casa', icono: '🎨' },
  { valor: 'Pintada', descripcion: 'Figura terminada, lista para llevar', icono: '✨' },
  { valor: 'Por mayor (local)', descripcion: 'Venta al por mayor en el local', icono: '📦' },
  { valor: 'Empresa por mayor', descripcion: 'Empresa sin contrato, precio por mayor', icono: '🏢' },
  { valor: 'Empresa con contrato', descripcion: 'Kits a precio exclusivo de contrato', icono: '📝' }
];

// Modalidades que entregan kit (5 pinturas + 1 pincel por figura)
export function esModalidadKit(modalidad: ModalidadVenta): boolean {
  return modalidad === 'Kit para llevar' || modalidad === 'Empresa con contrato';
}

// Modalidades en las que el precio de la figura se puede ajustar a mano en la venta
export function precioEditableEnVenta(modalidad: ModalidadVenta): boolean {
  return modalidad === 'Pintar en el local' || modalidad === 'Pintada';
}

// Precios de la figura que usa cada modalidad
export interface IPreciosFigura {
  crudo: number;
  mayor: number;
  pintarLocal: number;   // precio "pintar en el local" del producto
  terminada: number;     // precio "figura terminada" del producto
  kit?: number;          // valor del kit para llevar de esta figura (según su tamaño)
}

/*
  Precio unitario sugerido de una figura según la modalidad.
  "Pintar en el local" y "Pintada" usan los precios guardados en el producto
  (sugeridos crudo × 2 y × 4, editables en el producto y en la venta).
*/
export function precioPorModalidad(
  modalidad: ModalidadVenta,
  precios: IPreciosFigura,
  valores: IValoresConfiguracion
): number {
  switch (modalidad) {
    case 'Por mayor (local)':
    case 'Empresa por mayor':
      return precios.mayor;
    case 'Pintar en el local':
      return precios.pintarLocal;
    case 'Pintada':
      return precios.terminada;
    case 'Kit para llevar':
      return precios.crudo + (precios.kit ?? valores.valor_kit_local);
    case 'Empresa con contrato':
      return valores.precio_kit_contrato;
    default:
      return precios.crudo;
  }
}
