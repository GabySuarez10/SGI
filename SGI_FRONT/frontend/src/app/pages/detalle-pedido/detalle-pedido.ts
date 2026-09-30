import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductoPedido {
  nombre: string;
  solicitado: number;
  recibido: number;
  danado: number;
  precioEsperado: number;
}

@Component({
  selector: 'app-detalle-pedido',
  imports: [NgFor, DecimalPipe, FormsModule],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.css',
})
export class DetallePedido {

  productos: ProductoPedido[] = [
    {
      nombre: 'Muñeco de nieve',
      solicitado: 5,
      recibido: 5,
      danado: 0,
      precioEsperado: 3500
    },
    {
      nombre: 'Princesa Sofía',
      solicitado: 2,
      recibido: 2,
      danado: 1,
      precioEsperado: 4000
    },
    {
      nombre: 'Calabaza',
      solicitado: 5,
      recibido: 4,
      danado: 0,
      precioEsperado: 2000
    }
  ];

  constructor(private router: Router) {}

  volver() {
    this.router.navigate(['/pedidos-proveedor']);
  }

  getFaltantes(producto: ProductoPedido): number {
    return Math.max(producto.solicitado - producto.recibido, 0);
  }

  getSobrantes(producto: ProductoPedido): number {
    return Math.max(producto.recibido - producto.solicitado, 0);
  }

  getTotalProducto(producto: ProductoPedido): number {
    return producto.solicitado * producto.precioEsperado;
  }
  getTotalSolicitado(): number {
  return this.productos.reduce(
    (total, producto) => total + producto.solicitado,
    0
  );
}

  getTotalEsperado(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getTotalProducto(producto),
      0
    );
  }

  getTotalRecibido(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.recibido,
      0
    );
  }

  getTotalFaltantes(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getFaltantes(producto),
      0
    );
  }

  getTotalSobrantes(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getSobrantes(producto),
      0
    );
  }

  getTotalDanados(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.danado,
      0
    );
  }

  getValorFaltante(): number {
    return this.productos.reduce(
      (total, producto) =>
        total + (this.getFaltantes(producto) * producto.precioEsperado),
      0
    );
  }

  getValorDanado(): number {
    return this.productos.reduce(
      (total, producto) =>
        total + (producto.danado * producto.precioEsperado),
      0
    );
  }

  getCostoUtilizable(): number {
    return this.productos.reduce(
      (total, producto) => {
        const unidadesUtilizables = Math.max(
          producto.recibido - producto.danado,
          0
        );

        return total + (unidadesUtilizables * producto.precioEsperado);
      },
      0
    );
  }

  registrarRecepcion() {

    const recepcionValida = this.productos.every(
      producto =>
        producto.recibido >= 0 &&
        producto.danado >= 0 &&
        producto.danado <= producto.recibido
    );

    if (!recepcionValida) {
      alert(
        'La cantidad dañada no puede ser mayor que la cantidad recibida.'
      );
      return;
    }

    alert('Recepción registrada correctamente.');
  }

}