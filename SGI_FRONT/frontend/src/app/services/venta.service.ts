import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IVenta, IVentaNueva } from '../interfaces/venta.interface';

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private httpClient: HttpClient) {}

  getVentas(): Observable<IVenta[]> {
    return this.httpClient.get<IVenta[]>(this.apiUrl);
  }

  // Descuenta las unidades del local y guarda la venta
  registrarVenta(venta: IVentaNueva): Observable<IVenta> {
    return this.httpClient.post<IVenta>(this.apiUrl, venta);
  }

  anularVenta(codigo: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${codigo}`);
  }
}
