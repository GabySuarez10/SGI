import { anchosCode128, codigoBarrasSvg, escaparXml } from './codigo-barras';
import { admiteCodigoBarras } from './codigos';
import { qrSvg } from './qr';

/*
  Etiqueta completa de un producto como SVG: nombre + QR + tabla de precios +
  código de barras. La misma imagen se usa en pantalla, al imprimir y al
  descargar, así que lo que se ve es lo que sale impreso.

  Los precios van IMPRESOS en la etiqueta (para verlos sin escanear). El QR y el
  código de barras solo guardan la referencia, que es lo que el sistema
  necesita para reconocer el producto.
*/

export type ContenidoEtiqueta = 'ambos' | 'qr' | 'barras';

// Precios que se pueden imprimir en la etiqueta
export type TipoPrecio = 'crudo' | 'mayor' | 'pintar' | 'kit' | 'terminada';

export const PRECIOS_ETIQUETA: { valor: TipoPrecio; nombre: string; soloFiguras: boolean }[] = [
  { valor: 'crudo', nombre: 'Crudo', soloFiguras: false },
  { valor: 'mayor', nombre: 'Por mayor', soloFiguras: false },
  { valor: 'pintar', nombre: 'Pintar en local', soloFiguras: true },
  { valor: 'kit', nombre: 'Kit para llevar', soloFiguras: true },
  { valor: 'terminada', nombre: 'Terminada', soloFiguras: true }
];

export interface DatosEtiqueta {
  codigo: string;      // texto del QR y del código de barras (la referencia)
  nombre: string;
  detalle?: string;    // tamaño o colección, opcional
  esFigura?: boolean;  // pinturas, pinceles y otros solo llevan detal y por mayor
  precios?: Partial<Record<TipoPrecio, number>>;
}

export interface OpcionesEtiqueta {
  contenido: ContenidoEtiqueta;
  precios: TipoPrecio[];   // cuáles se imprimen ([] = ninguno)
}

// Por defecto: crudo, por mayor, pintar en el local y kit
export const PRECIOS_POR_DEFECTO: TipoPrecio[] = ['crudo', 'mayor', 'pintar', 'kit'];

export const OPCIONES_POR_DEFECTO: OpcionesEtiqueta = {
  contenido: 'ambos',
  precios: PRECIOS_POR_DEFECTO
};

/*
  Precios de un producto para la etiqueta.
  kit para llevar = precio crudo + valor del kit de su tamaño (o el general de Configuración).
*/
export function preciosDeProducto(
  producto: {
    tipo?: string | null;
    precio_venta: number;
    precio_mayorista: number;
    precio_pintar_local?: number;
    precio_terminada?: number;
    precio_kit_efectivo?: number;   // kit según el tamaño (lo calcula la API)
  },
  valorKit: number
): Partial<Record<TipoPrecio, number>> {
  const esFigura = (producto.tipo ?? 'figura') === 'figura';
  const precios: Partial<Record<TipoPrecio, number>> = {
    crudo: producto.precio_venta || 0,
    mayor: producto.precio_mayorista || 0
  };
  if (esFigura) {
    precios.pintar = producto.precio_pintar_local || (producto.precio_venta || 0) * 2;
    const kit = producto.precio_kit_efectivo ?? valorKit;
    precios.kit = (producto.precio_venta || 0) + (Number(kit) || 0);
    precios.terminada = producto.precio_terminada || precios.pintar * 2;
  }
  return precios;
}

// Filas de precio que efectivamente se imprimen (en el orden de PRECIOS_ETIQUETA)
function filasPrecio(datos: DatosEtiqueta, opciones: OpcionesEtiqueta): { nombre: string; valor: string }[] {
  const esFigura = datos.esFigura ?? true;
  return PRECIOS_ETIQUETA
    .filter(tipo => opciones.precios.includes(tipo.valor) && (esFigura || !tipo.soloFiguras))
    .map(tipo => ({
      nombre: !esFigura && tipo.valor === 'crudo' ? 'Detal' : tipo.nombre,
      valor: datos.precios?.[tipo.valor] ?? 0
    }))
    .filter(fila => fila.valor > 0)
    .map(fila => ({ nombre: fila.nombre, valor: formatoPrecio(fila.valor) }));
}

const ANCHO = 640;

// Quita la etiqueta <svg ...> exterior para incrustar el contenido en otra posición
function incrustar(svg: string, x: number, y: number, ancho: number, alto: number): string {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? `0 0 ${ancho} ${alto}`;
  const interior = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return (
    `<svg x="${x}" y="${y}" width="${ancho}" height="${alto}" viewBox="${viewBox}" ` +
    `preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">${interior}</svg>`
  );
}

// Código de barras que ocupa exactamente el ancho y alto indicados (en la etiqueta)
function barras(codigo: string, x: number, y: number, ancho: number, alto: number): string {
  const modulos = anchosCode128(codigo).reduce((a, b) => a + b, 0) + 20;   // + zonas de silencio
  const altoEnModulos = (modulos * alto) / ancho;
  const altoBarras = Math.max(10, Math.round(altoEnModulos - 12));          // 12 = texto debajo
  return incrustar(codigoBarrasSvg(codigo, { altoBarras }), x, y, ancho, alto);
}

// Parte el nombre en hasta dos líneas de ~maximo caracteres
function lineasNombre(nombre: string, maximo: number): string[] {
  const palabras = nombre.trim().split(/\s+/);
  const lineas: string[] = [''];
  for (const palabra of palabras) {
    const actual = lineas[lineas.length - 1];
    const propuesta = actual ? `${actual} ${palabra}` : palabra;
    if (propuesta.length <= maximo || !actual) {
      lineas[lineas.length - 1] = propuesta;
    } else if (lineas.length < 2) {
      lineas.push(palabra);
    } else {
      lineas[1] = `${lineas[1]} ${palabra}`;
    }
  }
  return lineas.map(linea => (linea.length > maximo ? linea.slice(0, maximo - 1) + '…' : linea));
}

function texto(x: number, y: number, contenido: string, tamano: number, peso = 400, ancla = 'start'): string {
  return (
    `<text x="${x}" y="${y}" font-family="Figtree, Arial, Helvetica, sans-serif" font-size="${tamano}" ` +
    `font-weight="${peso}" fill="#000" text-anchor="${ancla}">${escaparXml(contenido)}</text>`
  );
}

export function formatoPrecio(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

export function etiquetaSvg(datos: DatosEtiqueta, opciones: OpcionesEtiqueta): string {
  const conBarras = opciones.contenido !== 'qr' && admiteCodigoBarras(datos.codigo);
  const conQr = opciones.contenido !== 'barras' || !conBarras;
  const precios = filasPrecio(datos, opciones);

  const partes: string[] = [];

  // Nombre arriba, a todo el ancho (hasta dos líneas) y el detalle al lado
  const lineas = lineasNombre(datos.nombre, 30);
  let y = 40;
  lineas.forEach((linea, i) => {
    partes.push(texto(14, y, linea, 34, 700));
    if (i < lineas.length - 1) {
      y += 40;
    }
  });
  if (datos.detalle) {
    y += 32;
    partes.push(texto(14, y, datos.detalle.slice(0, 40), 24, 400));
  }
  y += 16;

  if (conQr) {
    // QR a la izquierda y tabla de precios a la derecha
    const ladoQr = 220;
    partes.push(incrustar(qrSvg(datos.codigo), 4, y, ladoQr, ladoQr));

    const xTabla = ladoQr + 18;
    if (precios.length) {
      partes.push(tablaPrecios(precios, xTabla, y + 4, ANCHO - 14 - xTabla, ladoQr - 8));
    } else if (!conBarras) {
      partes.push(texto(xTabla, y + ladoQr / 2 + 12, datos.codigo, 34, 700));
    }
    y += ladoQr + 6;
  } else if (precios.length) {
    // Solo código de barras: precios en dos columnas debajo del nombre
    const filas = Math.ceil(precios.length / 2);
    const anchoColumna = (ANCHO - 28 - 24) / 2;
    precios.forEach((precio, i) => {
      const columna = i < filas ? 0 : 1;
      const fila = i < filas ? i : i - filas;
      partes.push(tablaPrecios([precio], 14 + columna * (anchoColumna + 24), y + fila * 44, anchoColumna, 44));
    });
    y += filas * 44 + 10;
  }

  if (conBarras) {
    partes.push(barras(datos.codigo, 8, y, ANCHO - 16, conQr ? 150 : 170));
    y += conQr ? 152 : 172;
  }

  const alto = Math.round(y + 6);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="etiqueta-svg" viewBox="0 0 ${ANCHO} ${alto}" width="${ANCHO}" height="${alto}">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    partes.join('') +
    `</svg>`
  );
}

// Tabla "nombre ........ $precio" con líneas separadoras
function tablaPrecios(
  filas: { nombre: string; valor: string }[],
  x: number,
  y: number,
  ancho: number,
  altoDisponible: number
): string {
  const altoFila = Math.min(48, altoDisponible / filas.length);
  const tamano = Math.round(Math.min(30, altoFila * 0.62));
  let svg = '';
  filas.forEach((fila, i) => {
    const base = y + altoFila * i + altoFila / 2 + tamano * 0.36;
    svg += texto(x, base, fila.nombre, Math.round(tamano * 0.86), 400);
    svg += texto(x + ancho, base, fila.valor, tamano, 700, 'end');
    if (i < filas.length - 1) {
      const linea = y + altoFila * (i + 1);
      svg += `<line x1="${x}" y1="${linea}" x2="${x + ancho}" y2="${linea}" stroke="#bbb" stroke-width="1.5"/>`;
    }
  });
  return svg;
}
