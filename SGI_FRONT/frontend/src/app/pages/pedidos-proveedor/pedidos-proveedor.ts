import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
@Component({
  selector: 'app-pedidos-proveedor',
  imports: [NgIf],
  templateUrl: './pedidos-proveedor.html',
  styleUrl: './pedidos-proveedor.css',
})
export class PedidosProveedor {

  filtroActual = 'todos';

  cambiarFiltro(filtro: string) {
    this.filtroActual = filtro;
  }

}