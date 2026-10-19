import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EstadoFactura,
  IDatosFacturacion,
  IFactura,
  IFacturaNueva,
  IRespuestaDatosFacturacion
} from '../interfaces/factura.interface';
import { IVenta } from '../interfaces/venta.interface';

@Injectable({
  providedIn: 'root'
})
export class FacturaService {
  private apiUrl = `${environment.apiUrl}/facturas`;

  constructor(private httpClient: HttpClient) {}

  getFacturas(): Observable<IFactura[]> {
    return this.httpClient.get<IFactura[]>(this.apiUrl);
  }

  getFactura(codigo: number): Observable<IFactura> {
    return this.httpClient.get<IFactura>(`${this.apiUrl}/${codigo}`);
  }

  getFacturasDeVenta(venta: number): Observable<IFactura[]> {
    return this.httpClient.get<IFactura[]>(`${this.apiUrl}/venta/${venta}`);
  }

  getVentasSinFactura(): Observable<IVenta[]> {
    return this.httpClient.get<IVenta[]>(`${this.apiUrl}/ventas-sin-factura`);
  }

  // Emite la tirilla POS o la factura electrónica de una venta
  crearFactura(factura: IFacturaNueva): Observable<IFactura> {
    return this.httpClient.post<IFactura>(this.apiUrl, factura);
  }

  // Registra el CUFE/CUDE y la respuesta de la DIAN
  registrarValidacion(codigo: number, datos: { cufe?: string; estado?: EstadoFactura }): Observable<IFactura> {
    return this.httpClient.put<IFactura>(`${this.apiUrl}/${codigo}/dian`, datos);
  }

  anularFactura(codigo: number, motivo: string): Observable<IFactura> {
    return this.httpClient.post<IFactura>(`${this.apiUrl}/${codigo}/anular`, { motivo });
  }

  getDatos(): Observable<IRespuestaDatosFacturacion> {
    return this.httpClient.get<IRespuestaDatosFacturacion>(`${this.apiUrl}/datos`);
  }

  guardarDatos(datos: IDatosFacturacion): Observable<IRespuestaDatosFacturacion> {
    return this.httpClient.put<IRespuestaDatosFacturacion>(`${this.apiUrl}/datos`, datos);
  }
}
