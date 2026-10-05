import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface Proveedor {
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  descripcion: string;
}

@Component({
  selector: 'app-proveedores',
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores {

  busqueda = '';

  proveedores: Proveedor[] = [
    {
      nombre: 'Freddy Bogotá',
      telefono: '300 123 4567',
      direccion: 'Calle 80 # 20-15',
      ciudad: 'Bogotá',
      descripcion: 'Proveedor de figuras decorativas y productos de temporada.'
    },
    {
      nombre: 'Diego Cali',
      telefono: '310 987 6543',
      direccion: 'Carrera 5 # 12-30',
      ciudad: 'Cali',
      descripcion: 'Proveedor de figuras de yeso y artículos para pintar.'
    },
    {
      nombre: 'Arte y Figura',
      telefono: '315 456 7890',
      direccion: 'Carrera 10 # 25-40',
      ciudad: 'Medellín',
      descripcion: 'Proveedor de figuras decorativas para diferentes temporadas.'
    }
  ];

  constructor(private router: Router) {}

  get proveedoresFiltrados(): Proveedor[] {

    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      return this.proveedores;
    }

    return this.proveedores.filter(proveedor =>
      proveedor.nombre.toLowerCase().includes(texto) ||
      proveedor.ciudad.toLowerCase().includes(texto) ||
      proveedor.telefono.toLowerCase().includes(texto)
    );
  }

  nuevoProveedor() {
    alert('Aquí crearemos el formulario para registrar un proveedor.');
  }

  editarProveedor(proveedor: Proveedor) {
    alert(`Editar proveedor: ${proveedor.nombre}`);
  }

  limpiarBusqueda() {
    this.busqueda = '';
  }

}