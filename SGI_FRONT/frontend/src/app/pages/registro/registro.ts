import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {

  usuario = '';
  contrasena = '';
  confirmarContrasena = '';

  mostrarContrasena = false;
  mostrarConfirmacion = false;

  cargando = false;
  error = '';

  constructor(
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  crearCuenta(): void {

    if (
      !this.usuario.trim() ||
      !this.contrasena.trim() ||
      !this.confirmarContrasena.trim()
    ) {
      this.error = 'Completa todos los campos.';
      return;
    }

    if (this.contrasena !== this.confirmarContrasena) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.contrasena.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.usuarioService
      .registrar({ nombre: this.usuario.trim(), contrasena: this.contrasena })
      .subscribe({
        next: () => {
          this.cargando = false;
          alert('Cuenta creada correctamente. Ya puedes iniciar sesión.');
          this.router.navigate(['/login']);
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

  alternarConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }
}
