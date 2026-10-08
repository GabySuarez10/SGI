import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

/*
  Íconos de trazo uniforme (24×24, línea de 2px) para el menú y el encabezado.
  Uso: <app-icono nombre="bodega" [tamano]="20"></app-icono>
*/
const ICONOS: Record<string, string[]> = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
  productos: ['M21 8 12 3 3 8v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
  proveedores: [
    'M3 6h11v10H3z', 'M14 9h4l3 3v4h-7',
    'M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'
  ],
  pedidos: ['M9 3h6v3H9z', 'M15 4.5h3V21H6V4.5h3', 'M9 11h6', 'M9 15h4'],
  carrito: [
    'M3 4h2l2.4 11h10.8L20 7H6.2',
    'M8 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0', 'M15 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0'
  ],
  bodega: ['M3 21V8l9-5 9 5v13', 'M7 21v-8h10v8', 'M7 17h10'],
  local: [
    'M4 10v11h16V10',
    'M3 7 5 3h14l2 4v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
    'M10 21v-5h4v5'
  ],
  materiales: [
    'M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.2-1-1.7-1-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z',
    'M7.5 11.5h.01', 'M10 7.5h.01', 'M15 7.5h.01'
  ],
  traslados: ['M7 7h13', 'M16 3l4 4-4 4', 'M17 17H4', 'M8 13l-4 4 4 4'],
  ventas: ['M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  historial: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M12 7v5l3 2'],
  configuracion: [
    'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M12 2v3', 'M12 19v3', 'M4.9 4.9 7 7', 'M17 17l2.1 2.1',
    'M2 12h3', 'M19 12h3', 'M4.9 19.1 7 17', 'M17 7l2.1-2.1'
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  cerrar: ['M6 6l12 12', 'M18 6 6 18'],
  salir: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  usuario: ['M8 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M4 21c0-4 3.6-6 8-6s8 2 8 6'],
  abajo: ['M6 9l6 6 6-6']
};

@Component({
  selector: 'app-icono',
  imports: [NgFor],
  template: `
    <svg
      [attr.width]="tamano"
      [attr.height]="tamano"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false">
      <path *ngFor="let trazo of trazos" [attr.d]="trazo"></path>
    </svg>
  `,
  styles: [':host { display: inline-flex; flex-shrink: 0; line-height: 0; }']
})
export class Icono {
  @Input({ required: true }) nombre!: string;
  @Input() tamano = 20;

  get trazos(): string[] {
    return ICONOS[this.nombre] ?? [];
  }
}
