/*
  Código de barras Code 128 (juego B) generado en el navegador, sin servicios
  externos. Acepta letras, números y símbolos ASCII (ej. "DB00001").

  Uso:
    const svg = codigoBarrasSvg('DB00001');   // texto SVG listo para mostrar o descargar
*/

// Anchos de barra/espacio de cada símbolo (0..105) y el de parada (106)
const PATRONES: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

const INICIO_B = 104;
const PARADA = 106;
const ZONA_SILENCIO = 10;   // módulos en blanco a cada lado (obligatorio para leerlo)

// Cada símbolo convertido a anchos [barra, espacio, barra, ...]
export function anchosCode128(texto: string): number[] {
  const valores: number[] = [INICIO_B];
  for (const caracter of texto) {
    const ascii = caracter.charCodeAt(0);
    if (ascii < 32 || ascii > 126) {
      throw new Error(`El carácter "${caracter}" no se puede poner en un código de barras`);
    }
    valores.push(ascii - 32);
  }

  // Dígito de control: (inicio + suma(valor × posición)) mod 103
  const control = valores.reduce((suma, valor, i) => suma + valor * Math.max(i, 1), 0) % 103;
  valores.push(control, PARADA);

  return valores.flatMap(valor => PATRONES[valor].split('').map(Number));
}

/*
  SVG del código de barras.
  altoBarras: alto de las barras en módulos. conTexto: escribe el código debajo.
*/
export function codigoBarrasSvg(
  texto: string,
  opciones: { altoBarras?: number; conTexto?: boolean } = {}
): string {
  const altoBarras = opciones.altoBarras ?? 40;
  const conTexto = opciones.conTexto ?? true;
  const anchos = anchosCode128(texto);
  const anchoTotal = anchos.reduce((a, b) => a + b, 0) + ZONA_SILENCIO * 2;
  const altoTexto = conTexto ? 12 : 0;
  const alto = altoBarras + altoTexto;

  let x = ZONA_SILENCIO;
  let barras = '';
  anchos.forEach((ancho, i) => {
    if (i % 2 === 0) {
      barras += `M${x} 0h${ancho}v${altoBarras}h-${ancho}z`;
    }
    x += ancho;
  });

  const etiqueta = conTexto
    ? `<text x="${anchoTotal / 2}" y="${alto - 1}" text-anchor="middle" font-family="monospace" font-size="10" fill="#000">${escaparXml(texto)}</text>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${anchoTotal} ${alto}" ` +
    `shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<path d="${barras}" fill="#000"/>${etiqueta}</svg>`
  );
}

export function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
