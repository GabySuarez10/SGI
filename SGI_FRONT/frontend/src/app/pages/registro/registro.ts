import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {

  nombre = '';
  usuario = '';
  contrasena = '';
  confirmarContrasena = '';

  mostrarContrasena = false;
  mostrarConfirmacion = false;

  constructor(private router: Router) {}

  crearCuenta(): void {

    if (
      !this.nombre.trim() ||
      !this.usuario.trim() ||
      !this.contrasena.trim() ||
      !this.confirmarContrasena.trim()
    ) {
      alert('Completa todos los campos.');
      return;
    }

    if (this.contrasena !== this.confirmarContrasena) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    if (this.contrasena.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    alert('Cuenta creada correctamente.');

    this.router.navigate(['/login']);
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }
}