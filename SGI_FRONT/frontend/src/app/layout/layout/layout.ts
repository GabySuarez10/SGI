import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { VisorImagen } from '../../components/visor-imagen/visor-imagen';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar, Header, VisorImagen],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {

  // Menú lateral abierto (solo aplica en celular y tablet)
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.closeSidebar();
  }

  // Si se agranda la ventana a escritorio, el menú vuelve a su lugar
  @HostListener('window:resize')
  alCambiarTamano(): void {
    if (window.innerWidth > 900 && this.sidebarOpen) {
      this.closeSidebar();
    }
  }
}
