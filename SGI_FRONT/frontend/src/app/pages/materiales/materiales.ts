import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IProducto } from '../../interfaces/producto.interface';
import { IColeccion } from '../../interfaces/coleccion.interface';
import { ProductoService } from '../../services/producto.service';
import { ColeccionService } from '../../services/coleccion.service';
import { mensajeDeError } from '../../utils/http-error';
import { TipoProducto, tonoDePintura } from '../../utils/tipos';

type PestanaMateriales = 'pintura' | 'pincel' | 'otro';

/*
  Pinturas (agrupadas por colección), pinceles y otros materiales.
  Cada tono de una colección es un producto de tipo "pintura".
*/
@Component({
  selector: 'app-materiales',
  imports: [NgFor, NgIf, FormsModule, DecimalPipe],
  templateUrl: './materiales.html',
  styleUrl: './materiales.css'
})
export class Materiales implements OnInit {

  pestana: PestanaMateriales = 'pintura';
  busqueda = '';

  materiales: IProducto[] = [];
  colecciones: IColeccion[] = [];

  cargando = false;
  error = '';

  // Crear / renombrar colección
  creandoColeccion = false;
  nombreColeccion = '';
  editandoColeccion: IColeccion | null = null;
  guardandoColeccion = false;

  readonly pestanas: { valor: PestanaMateriales; nombre: string; icono: string }[] = [
    { valor: 'pintura', nombre: 'Pinturas', icono: '🎨' },
    { valor: 'pincel', nombre: 'Pinceles', icono: '🖌️' },
    { valor: 'otro', nombre: 'Otros materiales', icono: '🧰' }
  ];

  constructor(
    private productoService: ProductoService,
    private coleccionService: ColeccionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      productos: this.productoService.getProductos(),
      colecciones: this.coleccionService.getColecciones()
    }).subscribe({
      next: ({ productos, colecciones }) => {
        this.materiales = productos.filter(producto => producto.tipo !== 'figura');
        this.colecciones = colecciones;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  // ================================
  // FILTROS Y TOTALES
  // ================================

  private coincideBusqueda(producto: IProducto): boolean {
    const texto = this.busqueda.trim().toLowerCase();
    return !texto ||
      producto.nombre.toLowerCase().includes(texto) ||
      (producto.referencia ?? '').toLowerCase().includes(texto) ||
      (producto.coleccion ?? '').toLowerCase().includes(texto);
  }

  delTipo(tipo: TipoProducto): IProducto[] {
    return this.materiales.filter(producto => producto.tipo === tipo && this.coincideBusqueda(producto));
  }

  tonosDe(coleccion: IColeccion): IProducto[] {
    return this.delTipo('pintura').filter(producto => producto.coleccion === coleccion.nombre);
  }

  // Colecciones visibles: al buscar se ocultan las que no tienen coincidencias
  get coleccionesVisibles(): IColeccion[] {
    if (!this.busqueda.trim()) {
      return this.colecciones;
    }
    return this.colecciones.filter(
      coleccion =>
        coleccion.nombre.toLowerCase().includes(this.busqueda.trim().toLowerCase()) ||
        this.tonosDe(coleccion).length > 0
    );
  }

  cantidad(tipo: TipoProducto): number {
    return this.materiales.filter(producto => producto.tipo === tipo).length;
  }

  unidadesLocal(lista: IProducto[]): number {
    return lista.reduce((total, producto) => total + producto.existencias_local, 0);
  }

  get unidadesPinturasLocal(): number {
    return this.unidadesLocal(this.materiales.filter(producto => producto.tipo === 'pintura'));
  }

  get unidadesPincelesLocal(): number {
    return this.unidadesLocal(this.materiales.filter(producto => producto.tipo === 'pincel'));
  }

  tono(producto: IProducto): string {
    return tonoDePintura(producto.nombre, producto.coleccion);
  }

  // ================================
  // NAVEGACIÓN
  // ================================

  agregar(tipo: TipoProducto, coleccion = ''): void {
    const queryParams: Record<string, string> = { tipo, ubicacion: 'local', desde: 'materiales' };
    if (coleccion) {
      queryParams['coleccion'] = coleccion;
    }
    this.router.navigate(['/nuevo-producto'], { queryParams });
  }

  editar(producto: IProducto): void {
    this.router.navigate(['/editar-producto', producto.codigo], { queryParams: { desde: 'materiales' } });
  }

  // ================================
  // COLECCIONES
  // ================================

  abrirNuevaColeccion(): void {
    this.pestana = 'pintura';
    this.editandoColeccion = null;
    this.nombreColeccion = '';
    this.creandoColeccion = true;
  }

  abrirRenombrar(coleccion: IColeccion): void {
    this.creandoColeccion = false;
    this.editandoColeccion = coleccion;
    this.nombreColeccion = coleccion.nombre;
  }

  cancelarColeccion(): void {
    this.creandoColeccion = false;
    this.editandoColeccion = null;
    this.nombreColeccion = '';
  }

  guardarColeccion(): void {
    const nombre = this.nombreColeccion.trim();
    if (!nombre) {
      alert('Escribe el nombre de la colección.');
      return;
    }

    this.guardandoColeccion = true;
    const peticion = this.editandoColeccion
      ? this.coleccionService.actualizarColeccion(this.editandoColeccion.id, { nombre })
      : this.coleccionService.crearColeccion(nombre);

    peticion.subscribe({
      next: () => {
        this.guardandoColeccion = false;
        this.cancelarColeccion();
        this.cargar();
      },
      error: err => {
        this.guardandoColeccion = false;
        alert(mensajeDeError(err));
      }
    });
  }

  eliminarColeccion(coleccion: IColeccion): void {
    if (!confirm(`¿Eliminar la colección "${coleccion.nombre}"?`)) {
      return;
    }
    this.coleccionService.eliminarColeccion(coleccion.id).subscribe({
      next: () => this.cargar(),
      error: err => alert(mensajeDeError(err))
    });
  }
}
