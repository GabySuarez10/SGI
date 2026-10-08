import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IProveedor } from '../../interfaces/proveedor.interface';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';
import { TIPOS_PROVEEDOR } from '../../utils/tipos';

@Component({
  selector: 'app-editar-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-proveedor.html',
  styleUrl: './editar-proveedor.css'
})
export class EditarProveedor implements OnInit {

  proveedor: IProveedor = {
    nombre: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    descripcion: '',
    limite_precio: null,
    tipo: 'figuras'
  };

  readonly tiposProveedor = TIPOS_PROVEEDOR;

  // Nombre con el que está guardado (es la llave del proveedor)
  nombreOriginal = '';

  cargando = false;
  guardando = false;
  eliminando = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proveedorService: ProveedorService
  ) {}

  ngOnInit(): void {
    const nombreProveedor = this.route.snapshot.paramMap.get('nombre');

    if (!nombreProveedor) {
      this.router.navigate(['/proveedores']);
      return;
    }

    this.nombreOriginal = nombreProveedor;
    this.cargando = true;

    this.proveedorService.getProveedor(nombreProveedor).subscribe({
      next: proveedor => {
        this.proveedor = {
          nombre: proveedor.nombre,
          telefono: proveedor.telefono ?? '',
          direccion: proveedor.direccion ?? '',
          ciudad: proveedor.ciudad ?? '',
          descripcion: proveedor.descripcion ?? '',
          limite_precio: proveedor.limite_precio ?? null,
          tipo: proveedor.tipo ?? 'figuras'
        };
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  guardarCambios(): void {
    if (
      !this.proveedor.nombre.trim() ||
      !this.proveedor.telefono.trim() ||
      !this.proveedor.ciudad.trim()
    ) {
      this.error = 'Completa los campos obligatorios.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.proveedorService
      .actualizarProveedor(this.nombreOriginal, {
        ...this.proveedor,
        nombre: this.proveedor.nombre.trim(),
        limite_precio: Number(this.proveedor.limite_precio) || null
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          alert('Proveedor actualizado correctamente.');
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

  eliminarProveedor(): void {
    if (!confirm(`¿Eliminar el proveedor "${this.nombreOriginal}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.eliminando = true;
    this.error = '';
    this.proveedorService.eliminarProveedor(this.nombreOriginal).subscribe({
      next: () => {
        this.eliminando = false;
        alert(`El proveedor "${this.nombreOriginal}" se eliminó.`);
        this.router.navigate(['/proveedores']);
      },
      error: err => {
        this.eliminando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }
}
