import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-nuevo-proveedor',
  imports: [FormsModule, NgIf],
  templateUrl: './nuevo-proveedor.html',
  styleUrl: './nuevo-proveedor.css',
})
export class NuevoProveedor {

  nombre = '';
  telefono = '';
  direccion = '';
  ciudad = '';
  descripcion = '';

  guardando = false;
  error = '';

  constructor(
    private proveedorService: ProveedorService,
    private router: Router
  ) {}

  guardarProveedor(): void {

    if (!this.nombre.trim() || !this.telefono.trim() || !this.ciudad.trim()) {
      this.error = 'Completa los campos obligatorios.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.proveedorService.crearProveedor({
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      direccion: this.direccion.trim(),
      ciudad: this.ciudad.trim(),
      descripcion: this.descripcion.trim()
    }).subscribe({
      next: () => {
        this.guardando = false;
        alert('Proveedor registrado correctamente.');
        this.router.navigate(['/proveedores']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/proveedores']);
  }

}
