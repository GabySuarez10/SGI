import { Component } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductoLocal {
  codigo: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  existencias: number;
  precioVenta: number;
  precioMayorista: number;
}

@Component({
  selector: 'app-local',
  imports: [NgFor, NgIf, DecimalPipe, FormsModule],
  templateUrl: './local.html',
  styleUrl: './local.css',
})
export class Local {

  busqueda = '';
  proveedorSeleccionado = '';

  productos: ProductoLocal[] = [
    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=500&q=80',
      existencias: 8,
      precioVenta: 14200,
      precioMayorista: 7200
    },
    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=500&q=80',
      existencias: 5,
      precioVenta: 18200,
      precioMayorista: 10200
    },
    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      proveedor: 'Freddy Bogotá',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c0b5b4f0f?auto=format&fit=crop&w=500&q=80',
      existencias: 12,
      precioVenta: 8200,
      precioMayorista: 4200
    },
    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=500&q=80',
      existencias: 3,
      precioVenta: 12200,
      precioMayorista: 6200
    },
    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1544273677-3c0b9d5d6f54?auto=format&fit=crop&w=500&q=80',
      existencias: 6,
      precioVenta: 18200,
      precioMayorista: 10200
    },
    {
      codigo: 'DC0003',
      nombre: 'Reno',
      proveedor: 'Diego Cali',
      imagen: 'https://images.unsplash.com/photo-1482632629475-4f6f4d4e4b5d?auto=format&fit=crop&w=500&q=80',
      existencias: 2,
      precioVenta: 11400,
      precioMayorista: 5800
    }
  ];

  get proveedores(): string[] {
    return [
      ...new Set(
        this.productos.map(producto => producto.proveedor)
      )
    ];
  }

  get productosFiltrados(): ProductoLocal[] {

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