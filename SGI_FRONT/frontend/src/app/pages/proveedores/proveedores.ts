import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IProveedor } from '../../interfaces/proveedor.interface';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-proveedores',
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {

  busqueda = '';

  proveedores: IProveedor[] = [];
  cargando = false;
  error = '';

  constructor(
    private proveedorService: ProveedorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.cargando = true;
    this.error = '';

    this.proveedorService.getProveedores().subscribe({
      next: proveedores => {
        this.proveedores = proveedores;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get proveedoresFiltrados(): IProveedor[] {

    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      return this.proveedores;
    }

    return this.proveedores.filter(proveedor =>
      proveedor.nombre.toLowerCase().includes(texto) ||
      (proveedor.ciudad ?? '').toLowerCase().includes(texto) ||
      (proveedor.telefono ?? '').toLowerCase().includes(texto)
    );
  }

  editarProveedor(proveedor: IProveedor): void {
    this.router.navigate(['/editar-proveedor', proveedor.nombre]);
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
  }

}
