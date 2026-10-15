/*
  Códigos de barras / QR de los productos.

  Cada etiqueta guarda la REFERENCIA del producto (iniciales del proveedor +
  número, ej. "DB00001"). Si un producto aún no tiene referencia se usa su
  código interno (ej. "25").
*/

interface ConCodigo {
  codigo: number | string;
  referencia?: string | null;
}

// Texto que va dentro del código de barras y del QR
export function codigoDeProducto(producto: ConCodigo): string {
  return (producto.referencia ?? '').trim() || String(producto.codigo);
}

export function normalizarCodigo(texto: string): string {
  return (texto ?? '').trim().toUpperCase();
}

// El código de barras Code 128 solo admite caracteres ASCII imprimibles
export function admiteCodigoBarras(texto: string): boolean {
  return /^[\x20-\x7e]+$/.test(texto);
}

// Busca el producto escaneado por referencia o, si no, por código interno
export function buscarPorCodigo<T extends ConCodigo>(lista: T[], texto: string): T | undefined {
  const buscado = normalizarCodigo(texto);
  if (!buscado) {
    return undefined;
  }
  return (
    lista.find(producto => normalizarCodigo(producto.referencia ?? '') === buscado) ??
    lista.find(producto => String(producto.codigo) === buscado)
  );
}
