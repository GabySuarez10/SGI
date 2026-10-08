import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IInventarioBodega } from '../../interfaces/inventario.interface';
import { InventarioService } from '../../services/inventario.service';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import {
  VistaProductos,
  categoriasDe,
  coincideCategoria,
  coincideVista,
  nombreTipo
} from '../../utils/tipos';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-bodega',
  imports: [NgFor, NgIf, DecimalPipe, FormsModule, RouterLink, Ampliar],
  templateUrl: './bodega.html',
  styleUrl: './bodega.css',
})
export class Bodega implements OnInit {

  busqueda = '';
  proveedorSeleccionado = '';

  // Todos, solo figuras o solo pinturas, pinceles y otros
  vista: VistaProductos = 'todos';
  nombreTipo = nombreTipo;

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  productos: IInventarioBodega[] = [];
  cargando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private inventarioService: InventarioService,
    private router: Router
  ) {}

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

  get categorias(): string[] {
    return categoriasDe(this.productos);
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
        String(producto.codigo).includes(texto) ||
        (producto.referencia ?? '').toLowerCase().includes(texto);

      const coincideProveedor =
        !this.proveedorSeleccionado ||
        producto.proveedor === this.proveedorSeleccionado;

      const coincideCat =
        !this.categoriaSeleccionada ||
        (producto.tipo === 'figura' && coincideCategoria(producto.categoria, this.categoriaSeleccionada));

      return coincideVista(producto.tipo, this.vista) && coincideCat &&
        coincideBusqueda && coincideProveedor;
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

  // Abre el formulario de edición y vuelve a esta página al guardar
  editarProducto(codigo: number): void {
    this.router.navigate(['/editar-producto', codigo], { queryParams: { desde: 'bodega' } });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.proveedorSeleccionado = '';
    this.vista = 'todos';
    this.categoriaSeleccionada = '';
  }

}
