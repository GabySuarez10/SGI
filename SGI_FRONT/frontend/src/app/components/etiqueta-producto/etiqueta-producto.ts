import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatosEtiqueta, OPCIONES_POR_DEFECTO, OpcionesEtiqueta, etiquetaSvg } from '../../utils/etiqueta';

/*
  Muestra la etiqueta de un producto (QR + código de barras + datos).
  El SVG lo genera el propio sistema (utils/etiqueta.ts) y los textos van
  escapados, por eso se puede insertar como HTML.

  Uso: <app-etiqueta-producto [datos]="datos" [opciones]="opciones"></app-etiqueta-producto>
*/
@Component({
  selector: 'app-etiqueta-producto',
  template: `<div class="etiqueta" [innerHTML]="svg" role="img" [attr.aria-label]="descripcion"></div>`,
  styles: [`
    :host { display: block; }
    .etiqueta { line-height: 0; }
    .etiqueta ::ng-deep svg.etiqueta-svg { display: block; width: 100%; height: auto; }
  `]
})
export class EtiquetaProducto implements OnChanges {

  @Input({ required: true }) datos!: DatosEtiqueta;
  @Input() opciones: OpcionesEtiqueta = OPCIONES_POR_DEFECTO;

  svg: SafeHtml = '' as unknown as SafeHtml;
  descripcion = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    this.svg = this.sanitizer.bypassSecurityTrustHtml(etiquetaSvg(this.datos, this.opciones));
    this.descripcion = `Etiqueta de ${this.datos.nombre}, código ${this.datos.codigo}`;
  }
}
