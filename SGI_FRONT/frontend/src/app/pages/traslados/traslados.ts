import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ProductoTraslado {
  codigo: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  existencias: number;
  cantidadTraslado: number;
}

@Component({
  selector: 'app-traslados',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './traslados.html',
  styleUrl: './traslados.css',
})
export class Traslados {

  busqueda = '';

  productos: ProductoTraslado[] = [
    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=500&q=80',
      existencias: 18,
      cantidadTraslado: 0
    },
    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=500&q=80',
      existencias: 7,
      cantidadTraslado: 0
    },
    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c0b5b4f0f?auto=format&fit=crop&w=500&q=80',
      existencias: 24,
      cantidadTraslado: 0
    },
    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80',
      existencias: 4,
      cantidadTraslado: 0
    },
    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1544273677-3c0b9d5d6f54?auto=format&fit=crop&w=500&q=80',
      existencias: 12,
      cantidadTraslado: 0
    },
    {
      codigo: 'DC0003',
      nombre: 'Reno',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1482632629475-4f6f4d4e4b5d?auto=format&fit=crop&w=500&q=80',
      existencias: 2,
      cantidadTraslado: 0
    }
  ];

  constructor(private router: Router) {}

  get productosFiltrados(): ProductoTraslado[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto =>
      !texto ||
      producto.nombre.toLowerCase().includes(texto) ||
      producto.codigo.toLowerCase().includes(texto)
    );
  }

  get productosSeleccionados(): ProductoTraslado[] {
    return this.productos.filter(
      producto => producto.cantidadTraslado > 0
    );
  }

  get totalUnidades(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidadTraslado,
      0
    );
  }

  aumentar(producto: ProductoTraslado) {

    if (producto.cantidadTraslado < producto.existencias) {
      producto.cantidadTraslado++;
    }

  }

  disminuir(producto: ProductoTraslado) {

    if (producto.cantidadTraslado > 0) {
      producto.cantidadTraslado--;
    }

  }

  limpiar() {
    this.busqueda = '';

    this.productos.forEach(producto => {
      producto.cantidadTraslado = 0;
    });
  }

  registrarTraslado() {

    if (this.productosSeleccionados.length === 0) {
      alert('Selecciona al menos un producto para trasladar.');
      return;
    }

    const productosTexto = this.productosSeleccionados
      .map(producto =>
        `${producto.nombre}: ${producto.cantidadTraslado} unidades`
      )
      .join('\n');

    const mensaje =
      'Traslado registrado correctamente.\n\n' +
      `Unidades trasladadas al local: ${this.totalUnidades}\n\n` +
      productosTexto;

    alert(mensaje);

    this.router.navigate(['/local']);
  }

}