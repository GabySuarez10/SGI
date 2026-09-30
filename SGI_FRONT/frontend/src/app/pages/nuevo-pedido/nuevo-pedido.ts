import { Component } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Producto {
  referencia: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  cantidad: number;
  precioEsperado: number;
}

@Component({
  selector: 'app-nuevo-pedido',
  imports: [FormsModule, NgFor, NgIf, DecimalPipe],
  templateUrl: './nuevo-pedido.html',
  styleUrl: './nuevo-pedido.css',
})
export class NuevoPedido {

  pasoActual = 1;

  proveedor = '';
  fecha = '';
  destino = '';
  busqueda = '';

  productos: Producto[] = [
    {
      referencia: 'FB0001',
      nombre: 'Muñeco de nieve',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 3500
    },
    {
      referencia: 'FB0002',
      nombre: 'Princesa Sofía',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 4000
    },
    {
      referencia: 'FB0003',
      nombre: 'Calabaza',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c0b5b4f0f?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 2000
    },
    {
      referencia: 'DC0001',
      nombre: 'Ángel navideño',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 3000
    },
    {
      referencia: 'DC0002',
      nombre: 'Casita navideña',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1544273677-3c0b9d5d6f54?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 4500
    },
    {
      referencia: 'DC0003',
      nombre: 'Reno',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1482632629475-4f6f4d4e4b5d?auto=format&fit=crop&w=500&q=80',
      cantidad: 0,
      precioEsperado: 2800
    }
  ];

  constructor(private router: Router) {}

  get proveedores(): string[] {
    return [...new Set(this.productos.map(producto => producto.proveedor))];
  }

  get productosFiltrados(): Producto[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto => {

      const coincideProveedor =
        !this.proveedor ||
        producto.proveedor === this.proveedor;

      const coincideBusqueda =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        producto.referencia.toLowerCase().includes(texto);

      return coincideProveedor && coincideBusqueda;
    });
  }

  get productosSeleccionados(): Producto[] {
    return this.productos.filter(producto => producto.cantidad > 0);
  }

  get totalProductos(): number {
    return this.productosSeleccionados.length;
  }

  get totalUnidades(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) => total + producto.cantidad,
      0
    );
  }

  get precioTotal(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidad * producto.precioEsperado,
      0
    );
  }

  aumentarCantidad(producto: Producto) {
    producto.cantidad++;
  }

  disminuirCantidad(producto: Producto) {
    if (producto.cantidad > 0) {
      producto.cantidad--;
    }
  }

  actualizarProveedor() {
    this.busqueda = '';

    this.productos.forEach(producto => {
      if (producto.proveedor !== this.proveedor) {
        producto.cantidad = producto.cantidad;
      }
    });
  }

  continuar() {

    if (!this.proveedor || !this.fecha || !this.destino) {
      alert('Completa la información del pedido antes de continuar.');
      return;
    }

    if (this.totalUnidades === 0) {
      alert('Selecciona al menos un producto para continuar.');
      return;
    }

    this.pasoActual = 2;
  }

  volverAProductos() {
    this.pasoActual = 1;
  }

  guardarPedido() {

    if (this.productosSeleccionados.length === 0) {
      alert('Agrega al menos un producto al pedido.');
      return;
    }

    alert('Pedido registrado correctamente.');

    this.router.navigate(['/pedidos-proveedor']);
  }

  cancelar() {
    this.router.navigate(['/pedidos-proveedor']);
  }

}