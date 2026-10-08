import { Directive, ElementRef, HostListener } from '@angular/core';
import { VisorImagenService } from '../../services/visor-imagen.service';

/*
  Se pone en cualquier <img> para que al hacer clic se vea en grande:
    <img appAmpliar [src]="producto.imagen" [alt]="producto.nombre">
*/
@Directive({
  selector: 'img[appAmpliar]',
  host: {
    class: 'imagen-ampliable',
    role: 'button',
    tabindex: '0',
    title: 'Ver foto en grande'
  }
})
export class Ampliar {

  constructor(
    private elemento: ElementRef<HTMLImageElement>,
    private visor: VisorImagenService
  ) {}

  @HostListener('click', ['$event'])
  alHacerClic(evento: Event): void {
    // Evita que el clic también seleccione la tarjeta o el producto
    evento.stopPropagation();
    this.abrir();
  }

  @HostListener('keydown.enter', ['$event'])
  alPresionarEnter(evento: Event): void {
    evento.preventDefault();
    this.abrir();
  }

  private abrir(): void {
    const img = this.elemento.nativeElement;
    this.visor.abrir(img.currentSrc || img.src, img.alt);
  }
}
