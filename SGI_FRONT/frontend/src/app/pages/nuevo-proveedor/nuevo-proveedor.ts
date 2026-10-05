import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nuevo-proveedor',
  imports: [FormsModule],
  templateUrl: './nuevo-proveedor.html',
  styleUrl: './nuevo-proveedor.css',
})
export class NuevoProveedor {

  nombre = '';
  telefono = '';
  direccion = '';
  ciudad = '';
  descripcion = '';

  constructor(private router: Router) {}

  guardarProveedor() {

    if (!this.nombre || !this.telefono || !this.ciudad) {
      alert('Completa los campos obligatorios.');
      return;
    }

    alert('Proveedor registrado correctamente.');

    this.router.navigate(['/proveedores']);
  }

  cancelar() {
    this.router.navigate(['/proveedores']);
  }

}