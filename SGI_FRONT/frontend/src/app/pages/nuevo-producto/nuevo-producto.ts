import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ProductoNuevo {
  nombre: string;
  tamano: string;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-nuevo-producto',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './nuevo-producto.html',
  styleUrl: './nuevo-producto.css',
})
export class NuevoProducto {

  proveedor = '';

  // Proveedores registrados actualmente.
  // Más adelante estos datos vendrán del backend.
  proveedores = [
    'Freddy Bogotá',
    'Diego Cali',
    'Proveedor X'
  ];

  // Lista de productos que se van a registrar
  productos: ProductoNuevo[] = [
    {
      nombre: '',
      tamano: '',
      descripcion: '',
      imagen: ''
    }
  ];

  constructor(private router: Router) {}


  // Agregar otro producto a la lista
  agregarProducto(): void {

    this.productos.push({
      nombre: '',
      tamano: '',
      descripcion: '',
      imagen: ''
    });

  }


  // Eliminar un producto de la lista
  eliminarProducto(index: number): void {

    if (this.productos.length === 1) {
      return;
    }

    this.productos.splice(index, 1);

  }


  // Seleccionar imagen para un producto específico
  seleccionarImagen(event: Event, index: number): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];

    this.productos[index].imagen = URL.createObjectURL(archivo);

  }


  // Guardar todos los productos
  guardarProductos(): void {

    if (!this.proveedor) {
      alert('Selecciona un proveedor.');
      return;
    }


    // Revisar que todos los productos tengan
    // los campos obligatorios.
    const productoIncompleto = this.productos.some(producto =>
      !producto.nombre.trim() ||
      !producto.tamano.trim()
    );


    if (productoIncompleto) {
      alert(
        'Completa el nombre y tamaño de todos los productos.'
      );

      return;
    }


    alert(
      `${this.productos.length} producto(s) registrado(s) correctamente.`
    );

    this.router.navigate(['/productos']);

  }


  cancelar(): void {
    this.router.navigate(['/productos']);
  }

}