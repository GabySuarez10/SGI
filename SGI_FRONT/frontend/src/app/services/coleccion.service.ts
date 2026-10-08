import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IColeccion } from '../interfaces/coleccion.interface';

@Injectable({
  providedIn: 'root'
})
export class ColeccionService {
  private apiUrl = `${environment.apiUrl}/colecciones`;

  constructor(private httpClient: HttpClient) {}

  getColecciones(): Observable<IColeccion[]> {
    return this.httpClient.get<IColeccion[]>(this.apiUrl);
  }

  crearColeccion(nombre: string, descripcion = ''): Observable<IColeccion> {
    return this.httpClient.post<IColeccion>(this.apiUrl, { nombre, descripcion });
  }

  actualizarColeccion(id: number, datos: Partial<IColeccion>): Observable<IColeccion> {
    return this.httpClient.put<IColeccion>(`${this.apiUrl}/${id}`, datos);
  }

  eliminarColeccion(id: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${id}`);
  }
}
