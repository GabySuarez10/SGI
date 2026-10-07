import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IPedidoProveedor } from '../../interfaces/pedido-proveedor.interface';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { mensajeDeError } from '../../utils/http-error';

type FiltroPedidos = 'todos' | 'pendientes' | 'recibidos';

@Component({
  selector: 'app-pedidos-proveedor',
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  templateUrl: './pedidos-proveedor.html',
  styleUrl: './pedidos-proveedor.css',
})
export class PedidosProveedor implements OnInit {

  filtroActual: FiltroPedidos = 'todos';

  pedidos: IPedidoProveedor[] = [];
  cargando = false;
  error = '';

  constructor(private pedidoService: PedidoProveedorService) {}

  ngOnInit(): void {
    this.cargando = true;

    this.pedidoService.getPedidos().subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get pedidosFiltrados(): IPedidoProveedor[] {
    if (this.filtroActual === 'pendientes') {
      return this.pedidos.filter(pedido => !pedido.estado);
    }
    if (this.filtroActual === 'recibidos') {
      return this.pedidos.filter(pedido => pedido.estado);
    }
    return this.pedidos;
  }

  cambiarFiltro(filtro: FiltroPedidos): void {
    this.filtroActual = filtro;
  }

  // Suma de la lista de cantidades solicitadas
  totalUnidades(pedido: IPedidoProveedor): number {
    return pedido.cantidad.reduce((total, cantidad) => total + cantidad, 0);
  }

  // 7 -> "007"
  numeroPedido(codigo: number): string {
    return String(codigo).padStart(3, '0');
  }

}
