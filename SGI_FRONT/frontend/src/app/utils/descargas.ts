/*
  Descargar o copiar imágenes generadas en el navegador (etiquetas, QR...).
*/

// Convierte un SVG en una imagen PNG nítida (escala = multiplicador de tamaño)
export function svgAPng(svg: string, escala = 2): Promise<Blob> {
  return new Promise((resolver, rechazar) => {
    const ancho = Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 640);
    const alto = Number(/height="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 400);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const imagen = new Image();

    imagen.onload = () => {
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(ancho * escala);
      lienzo.height = Math.round(alto * escala);
      const contexto = lienzo.getContext('2d');
      if (!contexto) {
        URL.revokeObjectURL(url);
        rechazar(new Error('El navegador no permite crear la imagen'));
        return;
      }
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);
      contexto.imageSmoothingEnabled = false;
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      lienzo.toBlob(blob => (blob ? resolver(blob) : rechazar(new Error('No se pudo crear el PNG'))), 'image/png');
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se pudo dibujar la imagen'));
    };
    imagen.src = url;
  });
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function descargarSvgComoPng(svg: string, nombreArchivo: string, escala = 2): Promise<void> {
  descargarBlob(await svgAPng(svg, escala), nombreArchivo);
}

// Copia la imagen al portapapeles (para pegarla en WhatsApp, Word, etc.)
export async function copiarSvgComoImagen(svg: string, escala = 2): Promise<void> {
  const Item = (window as unknown as { ClipboardItem?: new (datos: Record<string, Blob | Promise<Blob>>) => unknown })
    .ClipboardItem;
  const portapapeles = navigator.clipboard as unknown as { write?: (items: unknown[]) => Promise<void> } | undefined;
  if (!Item || !portapapeles?.write) {
    throw new Error('Este navegador no permite copiar imágenes. Usa "Descargar".');
  }
  // Safari exige pasar la promesa directamente dentro del ClipboardItem
  await portapapeles.write([new Item({ 'image/png': svgAPng(svg, escala) })]);
}

export async function copiarTexto(texto: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const campo = document.createElement('textarea');
  campo.value = texto;
  document.body.appendChild(campo);
  campo.select();
  document.execCommand('copy');
  campo.remove();
}

// Nombre de archivo seguro: "DB00001-oso-navidad.png"
export function nombreArchivo(codigo: string, nombre: string, extension = 'png'): string {
  const limpio = `${codigo}-${nombre}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${limpio || 'etiqueta'}.${extension}`;
}
