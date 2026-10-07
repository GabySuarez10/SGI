import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IUsuario } from '../interfaces/usuario.interface';
import { UsuarioService } from './usuario.service';

const CLAVE_SESION = 'sgi_usuario';

// Guarda en el navegador el usuario que inició sesión.
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private usuarioService: UsuarioService) {}

  iniciarSesion(nombre: string, contrasena: string): Observable<IUsuario> {
    return this.usuarioService
      .login({ nombre, contrasena })
      .pipe(tap(usuario => this.guardarUsuario(usuario)));
  }

  guardarUsuario(usuario: IUsuario): void {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    } catch {
      // Si el navegador bloquea localStorage la sesión dura solo esta pestaña
    }
  }

  get usuarioActual(): IUsuario | null {
    try {
      const guardado = localStorage.getItem(CLAVE_SESION);
      return guardado ? (JSON.parse(guardado) as IUsuario) : null;
    } catch {
      return null;
    }
  }

  get estaAutenticado(): boolean {
    return this.usuarioActual !== null;
  }

  cerrarSesion(): void {
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      // nada que limpiar
    }
  }
}
