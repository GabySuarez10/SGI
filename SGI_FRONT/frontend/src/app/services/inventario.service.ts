import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IInventarioBodega, IInventarioLocal } from '../interfaces/inventario.interface';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private bodegaUrl = `${environment.apiUrl}/inventario-bodega`;
  private localUrl = `${environment.apiUrl}/inventario-local`;

  constructor(private httpClient: HttpClient) {}

  getBodega(): Observable<IInventarioBodega[]> {
    return this.httpClient.get<IInventarioBodega[]>(this.bodegaUrl);
  }

  getLocal(): Observable<IInventarioLocal[]> {
    return this.httpClient.get<IInventarioLocal[]>(this.localUrl);
  }

  actualizarBodega(codigo: number, datos: Partial<IInventarioBodega>): Observable<IInventarioBodega> {
    return this.httpClient.put<IInventarioBodega>(`${this.bodegaUrl}/${codigo}`, datos);
  }

  actualizarLocal(codigo: number, datos: Partial<IInventarioLocal>): Observable<IInventarioLocal> {
    return this.httpClient.put<IInventarioLocal>(`${this.localUrl}/${codigo}`, datos);
  }
}
