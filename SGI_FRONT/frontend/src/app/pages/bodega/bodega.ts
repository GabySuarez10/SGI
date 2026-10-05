import { Component } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductoBodega {
  codigo: string;
  nombre: string;
  proveedor: string;
  tamaño: string;
  imagen: string;
  existencias: number;
}

@Component({
  selector: 'app-bodega',
  imports: [NgFor, NgIf, DecimalPipe, FormsModule],
  templateUrl: './bodega.html',
  styleUrl: './bodega.css',
})
export class Bodega {

  busqueda = '';
  proveedorSeleccionado = '';

  productos: ProductoBodega[] = [
    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      proveedor: 'Freddy Bogotá',
      tamaño: '15 cm',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=500&q=80',
      existencias: 18
    },
    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      proveedor: 'Freddy Bogotá',
      tamaño: '20 cm',
      imagen: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=500&q=80',
      existencias: 7
    },
    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      proveedor: 'Freddy Bogotá',
      tamaño: '12 cm',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c0b5b4f0f?auto=format&fit=crop&w=500&q=80',
      existencias: 24
    },
    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      proveedor: 'Diego Cali',
      tamaño: '18 cm',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80',
      existencias: 4
    },
    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      proveedor: 'Diego Cali',
      tamaño: '16 cm',
      imagen: 'https://images.unsplash.com/photo-1544273677-3c0b9d5d6f54?auto=format&fit=crop&w=500&q=80',
      existencias: 12
    },
    {
      codigo: 'DC0003',
      nombre: 'Reno',
      proveedor: 'Diego Cali',
      tamaño: '14 cm',
      imagen: 'https://images.unsplash.com/photo-1482632629475-4f6f4d4e4b5d?auto=format&fit=crop&w=500&q=80',
      existencias: 2
    }
  ];

  get proveedores(): string[] {
    return [
      ...new Set(
        this.productos.map(producto => producto.proveedor)
      )
    ];
  }

  get productosFiltrados(): ProductoBodega[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto => {

      const coincideBusqueda =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        producto.codigo.toLowerCase().includes(texto);

      const coincideProveedor =
        !this.proveedorSeleccionado ||
        producto.proveedor === this.proveedorSeleccionado;

      return coincideBusqueda && coincideProveedor;
    });
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  get totalUnidades(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.existencias,
      0
    );
  }

  get productosStockBajo(): number {
    return this.productos.filter(
      producto => producto.existencias <= 5
    ).length;
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.proveedorSeleccionado = '';
  }

}