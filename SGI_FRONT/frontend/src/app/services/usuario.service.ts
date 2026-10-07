import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ICredenciales, IUsuario } from '../interfaces/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private httpClient: HttpClient) {}

  login(credenciales: ICredenciales): Observable<IUsuario> {
    return this.httpClient.post<IUsuario>(`${this.apiUrl}/login`, credenciales);
  }

  registrar(credenciales: ICredenciales): Observable<IUsuario> {
    return this.httpClient.post<IUsuario>(this.apiUrl, credenciales);
  }

  actualizar(id: number, datos: Partial<ICredenciales>): Observable<IUsuario> {
    return this.httpClient.put<IUsuario>(`${this.apiUrl}/${id}`, datos);
  }
}
