import { HttpErrorResponse } from '@angular/common/http';

// Convierte el error de la API en un mensaje legible para mostrar en pantalla
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con la API. Verifica que el backend esté corriendo.';
    }
    const cuerpo = error.error as { error?: string } | null;
    if (cuerpo && typeof cuerpo.error === 'string') {
      return cuerpo.error;
    }
    return `Error ${error.status}: ${error.statusText}`;
  }
  return 'Ocurrió un error inesperado.';
}
