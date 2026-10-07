import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion {

  usuario = '';
  nuevaContrasena = '';

  guardando = false;
  error = '';
  mensaje = '';

  // Datos de la empresa: aún no tienen tabla en la base de datos
  empresa = 'Pintarte';
  ciudad = 'Tuluá, Valle del Cauca';
  estadoEmpresa = 'Activa';

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {
    this.usuario = this.authService.usuarioActual?.nombre ?? '';
  }

  guardarCuenta(): void {
    const actual = this.authService.usuarioActual;
    if (!actual) {
      this.error = 'No hay una sesión activa.';
      return;
    }
    if (!this.usuario.trim()) {
      this.error = 'El usuario no puede estar vacío.';
      return;
    }

    const datos: { nombre: string; contrasena?: string } = { nombre: this.usuario.trim() };
    if (this.nuevaContrasena) {
      datos.contrasena = this.nuevaContrasena;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.usuarioService.actualizar(actual.id, datos).subscribe({
      next: usuario => {
        this.guardando = false;
        this.nuevaContrasena = '';
        this.authService.guardarUsuario(usuario);
        this.mensaje = 'Información de la cuenta actualizada correctamente.';
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
      }
    });
  }

  guardarEmpresa(): void {
    alert('Información de la empresa actualizada correctamente.');
  }
}
