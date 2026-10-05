import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Producto {
  codigo: string;
  nombre: string;
  proveedor: string;
  tamaño: string;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-producto.html',
  styleUrl: './editar-producto.css'
})
export class EditarProducto {

  producto: Producto = {
    codigo: '',
    nombre: '',
    proveedor: '',
    tamaño: '',
    descripcion: '',
    imagen: ''
  };

  productos: Producto[] = [
    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      proveedor: 'Freddy Bogotá',
      tamaño: '15 cm',
      descripcion: 'Figura decorativa de yeso.',
      imagen: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=500'
    },
    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      proveedor: 'Freddy Bogotá',
      tamaño: '20 cm',
      descripcion: 'Figura decorativa de princesa.',
      imagen: 'https://images.unsplash.com/photo-1594736797933-d0b22f8e8d35?w=500'
    },
    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      proveedor: 'Freddy Bogotá',
      tamaño: '12 cm',
      descripcion: 'Figura decorativa de calabaza.',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c3e0e4b8d?w=500'
    },
    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      proveedor: 'Diego Cali',
      tamaño: '18 cm',
      descripcion: 'Figura decorativa de ángel.',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=500'
    },
    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      proveedor: 'Diego Cali',
      tamaño: '16 cm',
      descripcion: 'Figura decorativa de casita.',
      imagen: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=500'
    },
    {
      codigo: 'DC0003',
      nombre: 'Reno',
      proveedor: 'Diego Cali',
      tamaño: '14 cm',
      descripcion: 'Figura decorativa de reno.',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=500'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    const codigo = this.route.snapshot.paramMap.get('codigo');

    const productoEncontrado = this.productos.find(
      producto => producto.codigo === codigo
    );

    if (productoEncontrado) {
      this.producto = { ...productoEncontrado };
    }
  }

  guardarCambios(): void {

    if (
      !this.producto.nombre.trim() ||
      !this.producto.proveedor.trim() ||
      !this.producto['tamaño'].trim()
    ) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    alert(
      `El producto ${this.producto.nombre} (${this.producto.codigo}) ` +
      `ha sido actualizado correctamente.`
    );

    this.router.navigate(['/productos']);
  }

  cancelar(): void {
    this.router.navigate(['/productos']);
  }

  cambiarImagen(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];

    const lector = new FileReader();

    lector.onload = () => {
      this.producto.imagen = lector.result as string;
    };

    lector.readAsDataURL(archivo);
  }
}