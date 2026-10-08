import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ICategoria } from '../interfaces/categoria.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private httpClient: HttpClient) {}

  getCategorias(): Observable<ICategoria[]> {
    return this.httpClient.get<ICategoria[]>(this.apiUrl);
  }

  crearCategoria(nombre: string): Observable<ICategoria> {
    return this.httpClient.post<ICategoria>(this.apiUrl, { nombre });
  }

  // Renombrar actualiza también las figuras que tenían la categoría
  actualizarCategoria(id: number, nombre: string): Observable<ICategoria> {
    return this.httpClient.put<ICategoria>(`${this.apiUrl}/${id}`, { nombre });
  }

  eliminarCategoria(id: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${id}`);
  }
}
