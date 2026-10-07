import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {

  menuUsuarioAbierto = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Nombre del usuario que inició sesión
  get nombreUsuario(): string {
    return this.authService.usuarioActual?.nombre ?? 'Invitado';
  }

  get iniciales(): string {
    return this.nombreUsuario
      .split(/[\s_.-]+/)
      .filter(parte => parte.length > 0)
      .slice(0, 2)
      .map(parte => parte.charAt(0).toUpperCase())
      .join('');
  }

  alternarMenuUsuario(): void {
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  irAConfiguracion(): void {
    this.menuUsuarioAbierto = false;

    this.router.navigate(['/configuracion']);
  }
}
