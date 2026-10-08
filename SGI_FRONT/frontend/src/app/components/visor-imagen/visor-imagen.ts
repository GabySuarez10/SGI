import { Component, HostListener } from '@angular/core';
import { NgIf } from '@angular/common';
import { VisorImagenService } from '../../services/visor-imagen.service';
import { Icono } from '../icono/icono';

// Muestra en grande la foto que se tocó (va una sola vez en el layout)
@Component({
  selector: 'app-visor-imagen',
  imports: [NgIf, Icono],
  templateUrl: './visor-imagen.html',
  styleUrl: './visor-imagen.css'
})
export class VisorImagen {

  constructor(public visor: VisorImagenService) {}

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.visor.cerrar();
  }
}
