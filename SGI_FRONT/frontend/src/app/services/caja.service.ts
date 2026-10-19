import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ICaja, ICajaHoy } from '../interfaces/caja.interface';

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private apiUrl = `${environment.apiUrl}/caja`;

  constructor(private httpClient: HttpClient) {}

  // Caja de hoy con su resumen (caja = null si aún no se abre)
  getHoy(): Observable<ICajaHoy> {
    return this.httpClient.get<ICajaHoy>(`${this.apiUrl}/hoy`);
  }

  getCajas(): Observable<ICaja[]> {
    return this.httpClient.get<ICaja[]>(this.apiUrl);
  }

  getCaja(codigo: number): Observable<ICaja> {
    return this.httpClient.get<ICaja>(`${this.apiUrl}/${codigo}`);
  }

  abrir(base: number, usuario: string): Observable<ICaja> {
    return this.httpClient.post<ICaja>(`${this.apiUrl}/abrir`, { base, usuario });
  }

  agregarMovimiento(
    codigo: number,
    movimiento: { tipo: 'entrada' | 'salida'; valor: number; motivo: string; categoria: string; usuario: string }
  ): Observable<ICaja> {
    return this.httpClient.post<ICaja>(`${this.apiUrl}/${codigo}/movimientos`, movimiento);
  }

  eliminarMovimiento(codigo: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/movimientos/${codigo}`);
  }

  // Cierre con conteo por billetes y monedas, o con el total ya contado
  cerrar(
    codigo: number,
    datos: { conteo?: Record<string, number>; efectivo_contado?: number; observaciones: string; usuario: string }
  ): Observable<ICaja> {
    return this.httpClient.post<ICaja>(`${this.apiUrl}/${codigo}/cerrar`, datos);
  }

  reabrir(codigo: number, motivo: string): Observable<ICaja> {
    return this.httpClient.post<ICaja>(`${this.apiUrl}/${codigo}/reabrir`, { motivo });
  }
}
