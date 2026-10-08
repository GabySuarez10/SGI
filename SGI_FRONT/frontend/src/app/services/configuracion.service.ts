import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IConfiguracion,
  ITarifaEnvio,
  IValoresConfiguracion
} from '../interfaces/configuracion.interface';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private apiUrl = `${environment.apiUrl}/configuracion`;

  constructor(private httpClient: HttpClient) {}

  // Valores generales + tarifas de envío + modalidades de venta
  getConfiguracion(): Observable<IConfiguracion> {
    return this.httpClient.get<IConfiguracion>(this.apiUrl);
  }

  actualizarValores(valores: Partial<IValoresConfiguracion>): Observable<IValoresConfiguracion> {
    return this.httpClient.put<IValoresConfiguracion>(this.apiUrl, valores);
  }

  getTarifasEnvio(): Observable<ITarifaEnvio[]> {
    return this.httpClient.get<ITarifaEnvio[]>(`${this.apiUrl}/tarifas-envio`);
  }

  // Reemplaza toda la tabla de tarifas por la lista enviada
  guardarTarifasEnvio(tarifas: ITarifaEnvio[]): Observable<ITarifaEnvio[]> {
    return this.httpClient.put<ITarifaEnvio[]>(`${this.apiUrl}/tarifas-envio`, tarifas);
  }
}
