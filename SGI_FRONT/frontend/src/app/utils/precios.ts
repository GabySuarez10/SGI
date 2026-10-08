import { IValoresConfiguracion } from '../interfaces/configuracion.interface';

/*
  Fórmulas de precio de Pintarte:

    precio crudo     = precio de fábrica × 4       + envío
    precio por mayor = (precio de fábrica × 4) ÷ 2 + envío

  Ejemplo: Oso navidad, fábrica 2.000, sin envío -> crudo 8.000, por mayor 4.000.
  El 4 y el 2 se pueden cambiar en Configuración.
*/
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
  { valor: 'Pintar en el local', descripcion: 'Figura en crudo + pinturas y técnica para pintarla en el local', icono: '🖌️' },
  { valor: 'Kit para llevar', descripcion: 'Figura + 5 pinturas + 1 pincel para pintar en casa', icono: '🎨' },
  { valor: 'Pintada', descripcion: 'Figura terminada: precio crudo + valor adicional', icono: '✨' },
  { valor: 'Por mayor (local)', descripcion: 'Venta al por mayor en el local', icono: '📦' },
  { valor: 'Empresa por mayor', descripcion: 'Empresa sin contrato, precio por mayor', icono: '🏢' },
  { valor: 'Empresa con contrato', descripcion: 'Kits a precio exclusivo de contrato', icono: '📝' }
];

// Modalidades que entregan kit (5 pinturas + 1 pincel por figura)
export function esModalidadKit(modalidad: ModalidadVenta): boolean {
  return modalidad === 'Kit para llevar' || modalidad === 'Empresa con contrato';
}

/*
  Precio unitario de una figura según la modalidad.
  adicionalPintada: valor que se suma al crudo en la modalidad "Pintada"
  (si no se envía, se usa el sugerido de Configuración).
*/
export function precioPorModalidad(
  modalidad: ModalidadVenta,
  precioCrudo: number,
  precioMayor: number,
  valores: IValoresConfiguracion,
  adicionalPintada: number = valores.valor_pintada
): number {
  switch (modalidad) {
    case 'Por mayor (local)':
    case 'Empresa por mayor':
      return precioMayor;
    case 'Pintar en el local':
      return precioCrudo + valores.valor_pintar_local;
    case 'Kit para llevar':
      return precioCrudo + valores.valor_kit_local;
    case 'Pintada':
      return precioCrudo + (Number(adicionalPintada) || 0);
    case 'Empresa con contrato':
      return valores.precio_kit_contrato;
    default:
      return precioCrudo;
  }
}
