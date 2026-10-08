import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IInventarioBodega, IInventarioLocal } from '../../interfaces/inventario.interface';
import { SentidoTraslado } from '../../interfaces/traslado.interface';
import { VistaProductos, categoriasDe, coincideCategoria, coincideVista } from '../../utils/tipos';
import { InventarioService } from '../../services/inventario.service';
import { TrasladoService } from '../../services/traslado.service';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

// Producto del inventario de origen + la cantidad que el usuario elige trasladar
interface ProductoTraslado {
  codigo: number;
  referencia: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  tipo: string;
  categoria: string;
  existencias: number;
  cantidadTraslado: number;
}

@Component({
  selector: 'app-traslados',
  imports: [NgFor, NgIf, FormsModule, Ampliar],
  templateUrl: './traslados.html',
  styleUrl: './traslados.css',
})
export class Traslados implements OnInit {

  busqueda = '';

  // De bodega al local o del local a bodega
  sentido: SentidoTraslado = 'bodega_local';

  // Todos, solo figuras o solo materiales
  vista: VistaProductos = 'todos';

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  productos: ProductoTraslado[] = [];
  cargando = false;
  guardando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private inventarioService: InventarioService,
    private trasladoService: TrasladoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarOrigen();
  }

  get origenNombre(): string {
    return this.sentido === 'bodega_local' ? 'Bodega' : 'Local';
  }

  get destinoNombre(): string {
    return this.sentido === 'bodega_local' ? 'Local' : 'Bodega';
  }

  cambiarSentido(sentido: SentidoTraslado): void {
    if (sentido === this.sentido) {
      return;
    }
    if (
      this.productosSeleccionados.length > 0 &&
      !confirm('Al cambiar el sentido se borran las cantidades seleccionadas. ¿Continuar?')
    ) {
      return;
    }
    this.sentido = sentido;
    this.cargarOrigen();
  }

  // Carga los productos del inventario de donde salen las unidades
  cargarOrigen(): void {
    this.cargando = true;
    this.error = '';
    this.productos = [];

    const convertir = (item: IInventarioBodega | IInventarioLocal): ProductoTraslado => ({
      codigo: item.codigo,
      referencia: item.referencia,
      nombre: item.nombre,
      proveedor: item.proveedor,
      imagen: item.imagen,
      tipo: item.tipo,
      categoria: item.categoria ?? '',
      existencias: item.existencias,
      cantidadTraslado: 0
    });

    // Se declara el tipo común para que TypeScript permita llamar a subscribe:
    // sin esto, "Observable<Bodega[]> | Observable<Local[]>" no es invocable.
    const peticion: Observable<(IInventarioBodega | IInventarioLocal)[]> =
      this.sentido === 'bodega_local'
        ? this.inventarioService.getBodega()
        : this.inventarioService.getLocal();

    peticion.subscribe({
      next: productos => {
        this.productos = productos.map(convertir);
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get productosFiltrados(): ProductoTraslado[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto =>
      coincideVista(producto.tipo, this.vista) &&
      (!this.categoriaSeleccionada ||
        (producto.tipo === 'figura' && coincideCategoria(producto.categoria, this.categoriaSeleccionada))) && (
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.referencia ?? '').toLowerCase().includes(texto) ||
        String(producto.codigo).includes(texto)
      )
    );
  }

  get categorias(): string[] {
    return categoriasDe(this.productos);
  }

  get productosSeleccionados(): ProductoTraslado[] {
    return this.productos.filter(
      producto => producto.cantidadTraslado > 0
    );
  }

  get totalUnidades(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidadTraslado,
      0
    );
  }

  aumentar(producto: ProductoTraslado): void {

    if (producto.cantidadTraslado < producto.existencias) {
      producto.cantidadTraslado++;
    }

  }

  disminuir(producto: ProductoTraslado): void {

    if (producto.cantidadTraslado > 0) {
      producto.cantidadTraslado--;
    }

  }

  limpiar(): void {
    this.busqueda = '';

    this.productos.forEach(producto => {
      producto.cantidadTraslado = 0;
    });
  }

  registrarTraslado(): void {

    if (this.productosSeleccionados.length === 0) {
      this.error = 'Selecciona al menos un producto para trasladar.';
      return;
    }

    const seleccionados = this.productosSeleccionados;
    this.guardando = true;
    this.error = '';

    // Se envían como listas paralelas: producto[i] -> cantidad[i]
    this.trasladoService.registrarTraslado({
      producto: seleccionados.map(producto => producto.nombre),
      cantidad: seleccionados.map(producto => producto.cantidadTraslado),
      sentido: this.sentido
    }).subscribe({
      next: () => {
        this.guardando = false;

        const productosTexto = seleccionados
          .map(producto =>
            `${producto.nombre}: ${producto.cantidadTraslado} unidades`
          )
          .join('\n');

        alert(
          'Traslado registrado correctamente.\n\n' +
          `${this.origenNombre} → ${this.destinoNombre}\n` +
          `Unidades trasladadas: ${this.totalUnidades}\n\n` +
          productosTexto
        );

        this.router.navigate([this.sentido === 'bodega_local' ? '/local' : '/bodega']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }

}
