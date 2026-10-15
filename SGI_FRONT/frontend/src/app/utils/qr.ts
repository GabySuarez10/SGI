/*
  Código QR generado en el navegador, sin servicios externos.
  Modo byte (UTF-8), corrección de errores nivel M (~15 %), versiones 1 a 10
  (hasta 213 bytes: de sobra para una referencia como "DB00001").

  Uso:
    const svg = qrSvg('DB00001');      // texto SVG listo para mostrar o descargar
    const matriz = qrMatriz('DB00001'); // boolean[][] (true = módulo oscuro)
*/

// Nivel M: codewords de corrección por bloque y número de bloques (índice = versión)
const ECC_POR_BLOQUE = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOQUES = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const VERSION_MAXIMA = 10;
const FORMATO_NIVEL_M = 0;      // bits de nivel en la información de formato
const ZONA_SILENCIO = 4;        // módulos en blanco alrededor (obligatorio)

// ---------------------------------------------------------------
// Aritmética en GF(256) y Reed-Solomon
// ---------------------------------------------------------------

function multiplicar(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function divisorReedSolomon(grado: number): number[] {
  const resultado = new Array<number>(grado).fill(0);
  resultado[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < resultado.length; j++) {
      resultado[j] = multiplicar(resultado[j], raiz);
      if (j + 1 < resultado.length) {
        resultado[j] ^= resultado[j + 1];
      }
    }
    raiz = multiplicar(raiz, 0x02);
  }
  return resultado;
}

function restoReedSolomon(datos: number[], divisor: number[]): number[] {
  const resultado = new Array<number>(divisor.length).fill(0);
  for (const byte of datos) {
    const factor = byte ^ (resultado.shift() as number);
    resultado.push(0);
    divisor.forEach((coef, i) => (resultado[i] ^= multiplicar(coef, factor)));
  }
  return resultado;
}

// ---------------------------------------------------------------
// Capacidad de cada versión
// ---------------------------------------------------------------

function modulosDeDatos(version: number): number {
  let resultado = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alineaciones = Math.floor(version / 7) + 2;
    resultado -= (25 * alineaciones - 10) * alineaciones - 55;
    if (version >= 7) {
      resultado -= 36;
    }
  }
  return resultado;
}

function codewordsDeDatos(version: number): number {
  return Math.floor(modulosDeDatos(version) / 8) - ECC_POR_BLOQUE[version] * BLOQUES[version];
}

function posicionesAlineacion(version: number, tamano: number): number[] {
  if (version === 1) {
    return [];
  }
  const cantidad = Math.floor(version / 7) + 2;
  const paso = Math.ceil((version * 4 + 4) / (cantidad * 2 - 2)) * 2;
  const resultado = [6];
  for (let pos = tamano - 7; resultado.length < cantidad; pos -= paso) {
    resultado.splice(1, 0, pos);
  }
  return resultado;
}

// ---------------------------------------------------------------
// Codificación
// ---------------------------------------------------------------

function codificarDatos(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const agregar = (valor: number, largo: number) => {
    for (let i = largo - 1; i >= 0; i--) {
      bits.push((valor >>> i) & 1);
    }
  };

  agregar(0x4, 4);                              // modo byte
  agregar(bytes.length, version <= 9 ? 8 : 16); // cantidad de bytes
  bytes.forEach(byte => agregar(byte, 8));

  const capacidad = codewordsDeDatos(version) * 8;
  agregar(0, Math.min(4, capacidad - bits.length));   // terminador
  agregar(0, (8 - (bits.length % 8)) % 8);            // completar el byte
  for (let relleno = 0xec; bits.length < capacidad; relleno ^= 0xec ^ 0x11) {
    agregar(relleno, 8);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  }
  return codewords;
}

function agregarCorreccionEIntercalar(datos: number[], version: number): number[] {
  const numBloques = BLOQUES[version];
  const eccLargo = ECC_POR_BLOQUE[version];
  const totales = Math.floor(modulosDeDatos(version) / 8);
  const bloquesCortos = numBloques - (totales % numBloques);
  const largoCorto = Math.floor(totales / numBloques);
  const divisor = divisorReedSolomon(eccLargo);

  const bloques: number[][] = [];
  for (let i = 0, k = 0; i < numBloques; i++) {
    const largo = largoCorto - eccLargo + (i < bloquesCortos ? 0 : 1);
    const dat = datos.slice(k, k + largo);
    k += largo;
    const ecc = restoReedSolomon(dat, divisor);
    if (i < bloquesCortos) {
      dat.push(0);   // relleno para alinear con los bloques largos (se omite al intercalar)
    }
    bloques.push(dat.concat(ecc));
  }

  const resultado: number[] = [];
  for (let i = 0; i < bloques[0].length; i++) {
    bloques.forEach((bloque, j) => {
      if (i !== largoCorto - eccLargo || j >= bloquesCortos) {
        resultado.push(bloque[i]);
      }
    });
  }
  return resultado;
}

// ---------------------------------------------------------------
// Matriz
// ---------------------------------------------------------------

class Matriz {
  readonly modulos: boolean[][];
  readonly esFuncion: boolean[][];

  constructor(readonly tamano: number) {
    this.modulos = Array.from({ length: tamano }, () => new Array<boolean>(tamano).fill(false));
    this.esFuncion = Array.from({ length: tamano }, () => new Array<boolean>(tamano).fill(false));
  }

  fijar(x: number, y: number, oscuro: boolean): void {
    this.modulos[y][x] = oscuro;
    this.esFuncion[y][x] = true;
  }
}

function dibujarPatrones(m: Matriz, version: number): void {
  const n = m.tamano;

  // Líneas de sincronización
  for (let i = 0; i < n; i++) {
    m.fijar(6, i, i % 2 === 0);
    m.fijar(i, 6, i % 2 === 0);
  }

  // Patrones de posición (las tres esquinas) con su separador
  const buscador = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) {
          const distancia = Math.max(Math.abs(dx), Math.abs(dy));
          m.fijar(x, y, distancia !== 2 && distancia !== 4);
        }
      }
    }
  };
  buscador(3, 3);
  buscador(n - 4, 3);
  buscador(3, n - 4);

  // Patrones de alineación
  const posiciones = posicionesAlineacion(version, n);
  const ultimo = posiciones.length - 1;
  posiciones.forEach((py, i) => {
    posiciones.forEach((px, j) => {
      const esquina = (i === 0 && j === 0) || (i === 0 && j === ultimo) || (i === ultimo && j === 0);
      if (esquina) {
        return;
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          m.fijar(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  // Reserva el área de formato (se escribe al final con la máscara elegida)
  dibujarFormato(m, 0);

  // Información de versión (versión 7 en adelante)
  if (version >= 7) {
    let resto = version;
    for (let i = 0; i < 12; i++) {
      resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
    }
    const bits = (version << 12) | resto;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m.fijar(a, b, bit);
      m.fijar(b, a, bit);
    }
  }
}

function dibujarFormato(m: Matriz, mascara: number): void {
  const n = m.tamano;
  const datos = (FORMATO_NIVEL_M << 3) | mascara;
  let resto = datos;
  for (let i = 0; i < 10; i++) {
    resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  }
  const bits = ((datos << 10) | resto) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;

  for (let i = 0; i <= 5; i++) {
    m.fijar(8, i, bit(i));
  }
  m.fijar(8, 7, bit(6));
  m.fijar(8, 8, bit(7));
  m.fijar(7, 8, bit(8));
  for (let i = 9; i < 15; i++) {
    m.fijar(14 - i, 8, bit(i));
  }

  for (let i = 0; i < 8; i++) {
    m.fijar(n - 1 - i, 8, bit(i));
  }
  for (let i = 8; i < 15; i++) {
    m.fijar(8, n - 15 + i, bit(i));
  }
  m.fijar(8, n - 8, true);   // módulo oscuro fijo
}

function dibujarCodewords(m: Matriz, datos: number[]): void {
  const n = m.tamano;
  let i = 0;
  for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) {
      derecha = 5;
    }
    for (let vertical = 0; vertical < n; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = derecha - j;
        const haciaArriba = ((derecha + 1) & 2) === 0;
        const y = haciaArriba ? n - 1 - vertical : vertical;
        if (!m.esFuncion[y][x] && i < datos.length * 8) {
          m.modulos[y][x] = ((datos[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function invierte(mascara: number, x: number, y: number): boolean {
  switch (mascara) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function aplicarMascara(m: Matriz, mascara: number): void {
  for (let y = 0; y < m.tamano; y++) {
    for (let x = 0; x < m.tamano; x++) {
      if (!m.esFuncion[y][x] && invierte(mascara, x, y)) {
        m.modulos[y][x] = !m.modulos[y][x];
      }
    }
  }
}

// Penalización estándar: se elige la máscara que deja el QR más fácil de leer
function penalizacion(m: Matriz): number {
  const n = m.tamano;
  const g = (x: number, y: number) => m.modulos[y][x];
  let total = 0;

  // Regla 1: rachas de 5 o más módulos del mismo color
  for (let eje = 0; eje < 2; eje++) {
    for (let a = 0; a < n; a++) {
      let racha = 1;
      for (let b = 1; b < n; b++) {
        const actual = eje === 0 ? g(b, a) : g(a, b);
        const anterior = eje === 0 ? g(b - 1, a) : g(a, b - 1);
        if (actual === anterior) {
          racha++;
        } else {
          if (racha >= 5) total += racha - 2;
          racha = 1;
        }
      }
      if (racha >= 5) total += racha - 2;
    }
  }

  // Regla 2: bloques de 2×2 del mismo color
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = g(x, y);
      if (c === g(x + 1, y) && c === g(x, y + 1) && c === g(x + 1, y + 1)) {
        total += 3;
      }
    }
  }

  // Regla 3: figuras parecidas a los patrones de posición
  const patronA = [true, false, true, true, true, false, true, false, false, false, false];
  const patronB = [false, false, false, false, true, false, true, true, true, false, true];
  for (let eje = 0; eje < 2; eje++) {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b <= n - 11; b++) {
        let iguala = true;
        let igualb = true;
        for (let k = 0; k < 11; k++) {
          const v = eje === 0 ? g(b + k, a) : g(a, b + k);
          if (v !== patronA[k]) iguala = false;
          if (v !== patronB[k]) igualb = false;
        }
        if (iguala) total += 40;
        if (igualb) total += 40;
      }
    }
  }

  // Regla 4: proporción de módulos oscuros
  let oscuros = 0;
  m.modulos.forEach(fila => fila.forEach(v => { if (v) oscuros++; }));
  const k = Math.ceil(Math.abs(oscuros * 20 - n * n * 10) / (n * n)) - 1;
  total += Math.max(k, 0) * 10;

  return total;
}

// ---------------------------------------------------------------
// API
// ---------------------------------------------------------------

export function qrMatriz(texto: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(texto));

  let version = 1;
  for (; version <= VERSION_MAXIMA; version++) {
    const cabecera = 4 + (version <= 9 ? 8 : 16);
    if (cabecera + bytes.length * 8 <= codewordsDeDatos(version) * 8) {
      break;
    }
  }
  if (version > VERSION_MAXIMA) {
    throw new Error('El texto es demasiado largo para el código QR');
  }

  const codewords = agregarCorreccionEIntercalar(codificarDatos(bytes, version), version);
  const tamano = version * 4 + 17;

  let mejor: Matriz | null = null;
  let mejorPuntaje = Infinity;
  for (let mascara = 0; mascara < 8; mascara++) {
    const m = new Matriz(tamano);
    dibujarPatrones(m, version);
    dibujarCodewords(m, codewords);
    aplicarMascara(m, mascara);
    dibujarFormato(m, mascara);
    const puntaje = penalizacion(m);
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = m;
    }
  }
  return (mejor as Matriz).modulos;
}

export function qrSvg(texto: string): string {
  const matriz = qrMatriz(texto);
  const tamano = matriz.length + ZONA_SILENCIO * 2;
  let camino = '';
  matriz.forEach((fila, y) =>
    fila.forEach((oscuro, x) => {
      if (oscuro) {
        camino += `M${x + ZONA_SILENCIO} ${y + ZONA_SILENCIO}h1v1h-1z`;
      }
    })
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamano} ${tamano}" ` +
    `shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<path d="${camino}" fill="#000"/></svg>`
  );
}
