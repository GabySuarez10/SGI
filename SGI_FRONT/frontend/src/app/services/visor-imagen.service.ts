import { Injectable } from '@angular/core';

export interface IImagenAmpliada {
  src: string;
  titulo: string;
}

// Guarda la foto que se está viendo en grande (null = visor cerrado)
@Injectable({
  providedIn: 'root'
})
export class VisorImagenService {
  imagen: IImagenAmpliada | null = null;

  abrir(src: string, titulo = ''): void {
    if (src) {
      this.imagen = { src, titulo };
    }
  }

  cerrar(): void {
    this.imagen = null;
  }
}
