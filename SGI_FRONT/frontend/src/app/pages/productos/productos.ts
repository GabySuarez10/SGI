import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface Producto {
  codigo: string;
  nombre: string;
  imagen: string;
  proveedor: string;
  tamaño: string;
  descripcion: string;
  existencias: number;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {

  busqueda = '';

  proveedorSeleccionado = '';

  productos: Producto[] = [
    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      imagen: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=500',
      proveedor: 'Freddy Bogotá',
      tamaño: '15 cm',
      descripcion: 'Figura decorativa de yeso.',
      existencias: 18
    },
    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      imagen: 'https://images.unsplash.com/photo-1594736797933-d0b22f8e8d35?w=500',
      proveedor: 'Freddy Bogotá',
      tamaño: '20 cm',
      descripcion: 'Figura decorativa de princesa.',
      existencias: 7
    },
    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c3e0e4b8d?w=500',
      proveedor: 'Freddy Bogotá',
      tamaño: '12 cm',
      descripcion: 'Figura decorativa de calabaza.',
      existencias: 24
    },
    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=500',
      proveedor: 'Diego Cali',
      tamaño: '18 cm',
      descripcion: 'Figura decorativa de ángel.',
      existencias: 4
    },
    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      imagen: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=500',
      proveedor: 'Diego Cali',
      tamaño: '16 cm',
      descripcion: 'Figura decorativa de casita.',
      existencias: 12
    },
    {
      codigo: 'DC0003',
      nombre: 'Reno',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=500',
      proveedor: 'Diego Cali',
      tamaño: '14 cm',
      descripcion: 'Figura decorativa de reno.',
      existencias: 2
    }
  ];

  constructor(private router: Router) {}

  get proveedores(): string[] {
    return [
      ...new Set(
        this.productos.map(producto => producto.proveedor)
      )
    ];
  }

  get productosFiltrados(): Producto[] {

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

  limpiarFiltros(): void {
    this.busqueda = '';
    this.proveedorSeleccionado = '';
  }

 editarProducto(producto: Producto): void {
  this.router.navigate(['/editar-producto', producto.codigo]);
}
}