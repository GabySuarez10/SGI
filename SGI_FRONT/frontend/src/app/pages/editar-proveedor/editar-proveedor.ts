import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IProveedor } from '../../interfaces/proveedor.interface';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';

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
    descripcion: ''
  };

  // Nombre con el que está guardado (es la llave del proveedor)
  nombreOriginal = '';

  cargando = false;
  guardando = false;
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
          descripcion: proveedor.descripcion ?? ''
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
        nombre: this.proveedor.nombre.trim()
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
}
