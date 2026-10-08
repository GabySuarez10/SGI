import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IProducto } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
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
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Ampliar],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos implements OnInit {

  busqueda = '';

  proveedorSeleccionado = '';

  // Todos, solo figuras o solo pinturas, pinceles y otros
  vista: VistaProductos = 'todos';
  readonly vistas: { valor: VistaProductos; nombre: string }[] = [
    { valor: 'todos', nombre: 'Todos' },
    { valor: 'figuras', nombre: 'Figuras' },
    { valor: 'materiales', nombre: 'Pinturas, pinceles y otros' }
  ];
  nombreTipo = nombreTipo;

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  // '' = todas, 'bodega', 'local' o 'sin' (sin ubicación)
  ubicacionSeleccionada = '';

  productos: IProducto[] = [];
  cargando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private productoService: ProductoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargando = true;

    this.productoService.getProductos().subscribe({
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

  get productosFiltrados(): IProducto[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto => {

      const coincideBusqueda =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.coleccion ?? '').toLowerCase().includes(texto) ||
        (producto.referencia ?? '').toLowerCase().includes(texto) ||
        String(producto.codigo).includes(texto);

      const coincideProveedor =
        !this.proveedorSeleccionado ||
        producto.proveedor === this.proveedorSeleccionado;

      const coincideUbicacion =
        !this.ubicacionSeleccionada ||
        (this.ubicacionSeleccionada === 'bodega' && producto.en_bodega) ||
        (this.ubicacionSeleccionada === 'local' && producto.en_local) ||
        (this.ubicacionSeleccionada === 'sin' && !producto.en_bodega && !producto.en_local);

      const coincideCat =
        !this.categoriaSeleccionada ||
        (producto.tipo === 'figura' && coincideCategoria(producto.categoria, this.categoriaSeleccionada));

      return coincideVista(producto.tipo, this.vista) && coincideCat &&
        coincideBusqueda && coincideProveedor && coincideUbicacion;
    });
  }

  get categorias(): string[] {
    return categoriasDe(this.productos);
  }

  contarVista(vista: VistaProductos): number {
    return this.productos.filter(producto => coincideVista(producto.tipo, vista)).length;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.proveedorSeleccionado = '';
    this.ubicacionSeleccionada = '';
    this.categoriaSeleccionada = '';
  }

  editarProducto(producto: IProducto): void {
    this.router.navigate(['/editar-producto', producto.codigo]);
  }
}
