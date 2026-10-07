import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IProveedor } from '../interfaces/proveedor.interface';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private apiUrl = `${environment.apiUrl}/proveedores`;

  constructor(private httpClient: HttpClient) {}

  getProveedores(): Observable<IProveedor[]> {
    return this.httpClient.get<IProveedor[]>(this.apiUrl);
  }

  getProveedor(nombre: string): Observable<IProveedor> {
    return this.httpClient.get<IProveedor>(`${this.apiUrl}/${encodeURIComponent(nombre)}`);
  }

  crearProveedor(proveedor: IProveedor): Observable<IProveedor> {
    return this.httpClient.post<IProveedor>(this.apiUrl, proveedor);
  }

  // nombreActual identifica al proveedor; proveedor.nombre puede traer un nombre nuevo
  actualizarProveedor(nombreActual: string, proveedor: IProveedor): Observable<IProveedor> {
    return this.httpClient.put<IProveedor>(
      `${this.apiUrl}/${encodeURIComponent(nombreActual)}`,
      proveedor
    );
  }

  eliminarProveedor(nombre: string): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${encodeURIComponent(nombre)}`);
  }
}
