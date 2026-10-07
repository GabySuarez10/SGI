// Imagen que se muestra cuando el producto no tiene URL o la URL no carga
export const IMAGEN_POR_DEFECTO =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<rect width="400" height="300" fill="#eef1f6"/>' +
    '<rect x="150" y="95" width="100" height="80" rx="8" fill="none" stroke="#9aa5b8" stroke-width="6"/>' +
    '<circle cx="178" cy="122" r="10" fill="#9aa5b8"/>' +
    '<path d="M156 168l30-30 22 22 14-14 22 22" fill="none" stroke="#9aa5b8" stroke-width="6"/>' +
    '<text x="200" y="215" font-family="sans-serif" font-size="18" fill="#7a869a" text-anchor="middle">Sin imagen</text>' +
    '</svg>'
  );

// Úsalo en el template: <img [src]="producto.imagen || imagenPorDefecto" (error)="imagenNoCarga($event)">
export function imagenNoCarga(event: Event): void {
  const img = event.target as HTMLImageElement;
  if (img.src !== IMAGEN_POR_DEFECTO) {
    img.src = IMAGEN_POR_DEFECTO;
  }
}

// Valida que el texto sea una URL http(s) para usarla en el src de <img>
export function esUrlImagen(valor: string): boolean {
  return /^https?:\/\/\S+$/i.test(valor.trim());
}
