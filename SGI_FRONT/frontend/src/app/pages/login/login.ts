import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  usuario = '';
  contrasena = '';
  mostrarContrasena = false;

  cargando = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  iniciarSesion(): void {
    if (!this.usuario.trim() || !this.contrasena.trim()) {
      this.error = 'Completa el usuario y la contraseña.';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.authService.iniciarSesion(this.usuario.trim(), this.contrasena).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/']);
      },
      error: err => {
        this.cargando = false;
        this.error = mensajeDeError(err);
      }
    });
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }
}
