import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IInventarioBodega } from '../../interfaces/inventario.interface';
import { InventarioService } from '../../services/inventario.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-bodega',
  imports: [NgFor, NgIf, DecimalPipe, FormsModule],
  templateUrl: './bodega.html',
  styleUrl: './bodega.css',
})
export class Bodega implements OnInit {

  busqueda = '';
  proveedorSeleccionado = '';

  productos: IInventarioBodega[] = [];
  cargando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.cargando = true;

    this.inventarioService.getBodega().subscribe({
      next: productos => {
        this.productos = productos;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get proveedores(): string[] {
    return [
      ...new Set(
        this.productos.map(producto => producto.proveedor)
      )
    ];
  }

  get productosFiltrados(): IInventarioBodega[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto => {

      const coincideBusqueda =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        String(producto.codigo).includes(texto);

      const coincideProveedor =
        !this.proveedorSeleccionado ||
        producto.proveedor === this.proveedorSeleccionado;

      return coincideBusqueda && coincideProveedor;
    });
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  get totalUnidades(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.existencias,
      0
    );
  }

  get productosStockBajo(): number {
    return this.productos.filter(
      producto => producto.existencias <= 5
    ).length;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.proveedorSeleccionado = '';
  }

}
