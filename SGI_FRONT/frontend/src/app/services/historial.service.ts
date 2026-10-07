import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IMovimiento } from '../interfaces/movimiento.interface';
import { IResumenDashboard } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  constructor(private httpClient: HttpClient) {}

  getMovimientos(): Observable<IMovimiento[]> {
    return this.httpClient.get<IMovimiento[]>(`${environment.apiUrl}/historial`);
  }

  getResumenDashboard(): Observable<IResumenDashboard> {
    return this.httpClient.get<IResumenDashboard>(`${environment.apiUrl}/dashboard`);
  }
}
