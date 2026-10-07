import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ITraslado, ITrasladoNuevo } from '../interfaces/traslado.interface';

@Injectable({
  providedIn: 'root'
})
export class TrasladoService {
  private apiUrl = `${environment.apiUrl}/traslados`;

  constructor(private httpClient: HttpClient) {}

  getTraslados(): Observable<ITraslado[]> {
    return this.httpClient.get<ITraslado[]>(this.apiUrl);
  }

  // Descuenta de bodega y suma al local en una sola operación
  registrarTraslado(traslado: ITrasladoNuevo): Observable<ITraslado> {
    return this.httpClient.post<ITraslado>(this.apiUrl, traslado);
  }

  anularTraslado(codigo: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${codigo}`);
  }
}
