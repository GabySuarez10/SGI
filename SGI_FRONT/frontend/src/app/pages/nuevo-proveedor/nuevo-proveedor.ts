import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';
import { TIPOS_PROVEEDOR, TipoProveedor } from '../../utils/tipos';

@Component({
  selector: 'app-nuevo-proveedor',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './nuevo-proveedor.html',
  styleUrl: './nuevo-proveedor.css',
})
export class NuevoProveedor {

  nombre = '';
  telefono = '';
  direccion = '';
  ciudad = '';
  descripcion = '';

  // Figuras, materiales (pinturas, pinceles y otros) o ambos
  readonly tiposProveedor = TIPOS_PROVEEDOR;
  tipo: TipoProveedor = 'figuras';

  // Precio máximo por figura pactado con el proveedor (null = sin límite)
  limitePrecio: number | null = null;

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
      descripcion: this.descripcion.trim(),
      limite_precio: Number(this.limitePrecio) || null,
      tipo: this.tipo
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
