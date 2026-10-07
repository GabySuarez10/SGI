import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IProducto, IRegistroProductos } from '../interfaces/producto.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = `${environment.apiUrl}/productos`;

  constructor(private httpClient: HttpClient) {}

  getProductos(): Observable<IProducto[]> {
    return this.httpClient.get<IProducto[]>(this.apiUrl);
  }

  getProducto(codigo: number): Observable<IProducto> {
    return this.httpClient.get<IProducto>(`${this.apiUrl}/${codigo}`);
  }

  // Registra uno o varios productos de un mismo proveedor
  crearProductos(registro: IRegistroProductos): Observable<IProducto[]> {
    return this.httpClient.post<IProducto[]>(this.apiUrl, registro);
  }

  actualizarProducto(codigo: number, producto: Partial<IProducto>): Observable<IProducto> {
    return this.httpClient.put<IProducto>(`${this.apiUrl}/${codigo}`, producto);
  }

  eliminarProducto(codigo: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${codigo}`);
  }
}
