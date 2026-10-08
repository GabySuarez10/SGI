// Tipos de producto del catálogo
export type TipoProducto = 'figura' | 'pintura' | 'pincel' | 'otro';

// Proveedor de figuras, de materiales (pinturas, pinceles y otros) o de ambos
export type TipoProveedor = 'figuras' | 'materiales' | 'ambos';

// Vistas para filtrar listas: todo, solo figuras o solo materiales
export type VistaProductos = 'todos' | 'figuras' | 'materiales';

export const TIPOS_PRODUCTO: { valor: TipoProducto; nombre: string; plural: string; icono: string }[] = [
  { valor: 'figura', nombre: 'Figura', plural: 'Figuras', icono: '🏺' },
  { valor: 'pintura', nombre: 'Pintura', plural: 'Pinturas', icono: '🎨' },
  { valor: 'pincel', nombre: 'Pincel', plural: 'Pinceles', icono: '🖌️' },
  { valor: 'otro', nombre: 'Otro material', plural: 'Otros materiales', icono: '🧰' }
];

export const TIPOS_PROVEEDOR: { valor: TipoProveedor; nombre: string }[] = [
  { valor: 'figuras', nombre: 'Figuras' },
  { valor: 'materiales', nombre: 'Pinturas, pinceles y otros' },
  { valor: 'ambos', nombre: 'Figuras y materiales' }
];

export function nombreTipo(tipo: string | null | undefined): string {
  return TIPOS_PRODUCTO.find(item => item.valor === tipo)?.nombre ?? 'Figura';
}

export function nombreTipoProveedor(tipo: string | null | undefined): string {
  return TIPOS_PROVEEDOR.find(item => item.valor === tipo)?.nombre ?? 'Figuras';
}

export function esMaterial(tipo: string | null | undefined): boolean {
  return !!tipo && tipo !== 'figura';
}

// ¿El producto entra en la vista elegida?
export function coincideVista(tipo: string | null | undefined, vista: VistaProductos): boolean {
  if (vista === 'figuras') {
    return !esMaterial(tipo);
  }
  if (vista === 'materiales') {
    return esMaterial(tipo);
  }
  return true;
}

// ¿Este proveedor vende productos de este tipo?
export function proveedorVende(tipoProveedor: string | null | undefined, tipoProducto: TipoProducto): boolean {
  const tipo = tipoProveedor || 'figuras';
  if (tipo === 'ambos') {
    return true;
  }
  return tipoProducto === 'figura' ? tipo === 'figuras' : tipo === 'materiales';
}

// Nombre de una pintura: "Colección - Tono" (los nombres no se repiten entre colecciones)
export function nombrePintura(coleccion: string, tono: string): string {
  return `${coleccion.trim()} - ${tono.trim()}`;
}

// "Gamusa - Rojo" -> "Rojo"
export function tonoDePintura(nombre: string, coleccion: string): string {
  const prefijo = `${coleccion} - `;
  return coleccion && nombre.startsWith(prefijo) ? nombre.slice(prefijo.length) : nombre;
}

// '' = todas las categorías; 'sin' = figuras sin categoría
export function coincideCategoria(categoria: string | null | undefined, filtro: string): boolean {
  if (!filtro) {
    return true;
  }
  if (filtro === 'sin') {
    return !categoria;
  }
  return (categoria ?? '') === filtro;
}

// Categorías presentes en una lista de productos (para llenar el filtro)
export function categoriasDe(items: { categoria?: string | null }[]): string[] {
  return [...new Set(items.map(item => item.categoria ?? '').filter(categoria => categoria !== ''))].sort();
}
