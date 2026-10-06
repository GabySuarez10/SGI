import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {

  menuUsuarioAbierto = false;

  constructor(private router: Router) {}

  alternarMenuUsuario(): void {
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;

    this.router.navigate(['/login']);
  }

  irAConfiguracion(): void {
    this.menuUsuarioAbierto = false;

    this.router.navigate(['/configuracion']);
  }
}