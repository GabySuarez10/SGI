import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  usuario = '';
  contrasena = '';
  mostrarContrasena = false;

  constructor(private router: Router) {}

  iniciarSesion(): void {
    if (!this.usuario.trim() || !this.contrasena.trim()) {
      alert('Completa el usuario y la contraseña.');
      return;
    }

    // Por ahora simulamos el inicio de sesión.
    this.router.navigate(['/']);
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }
}