import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IPedidoNuevo,
  IPedidoProveedor,
  IRecepcionPedido
} from '../interfaces/pedido-proveedor.interface';

@Injectable({
  providedIn: 'root'
})
export class PedidoProveedorService {
  private apiUrl = `${environment.apiUrl}/pedidos-proveedor`;

  constructor(private httpClient: HttpClient) {}

  getPedidos(): Observable<IPedidoProveedor[]> {
    return this.httpClient.get<IPedidoProveedor[]>(this.apiUrl);
  }

  getPedido(codigo: number): Observable<IPedidoProveedor> {
    return this.httpClient.get<IPedidoProveedor>(`${this.apiUrl}/${codigo}`);
  }

  crearPedido(pedido: IPedidoNuevo): Observable<IPedidoProveedor> {
    return this.httpClient.post<IPedidoProveedor>(this.apiUrl, pedido);
  }

  // Marca el pedido como recibido y suma las unidades buenas al inventario
  registrarRecepcion(codigo: number, recepcion: IRecepcionPedido): Observable<IPedidoProveedor> {
    return this.httpClient.put<IPedidoProveedor>(`${this.apiUrl}/${codigo}/recepcion`, recepcion);
  }

  eliminarPedido(codigo: number): Observable<unknown> {
    return this.httpClient.delete(`${this.apiUrl}/${codigo}`);
  }
}
