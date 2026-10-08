import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { IProveedor } from '../../interfaces/proveedor.interface';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';
import { hoyISO } from '../../utils/fecha';
import { categoriasDe, coincideCategoria, esMaterial, nombreTipo } from '../../utils/tipos';

// Producto del catálogo con la cantidad y el precio que se van a pedir
interface ProductoPedido {
  referencia: string;
  tipo: string;
  categoria: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  cantidad: number;
  precioEsperado: number;
}

type Destino = '' | 'bodega' | 'local';

@Component({
  selector: 'app-nuevo-pedido',
  imports: [FormsModule, NgFor, NgIf, DecimalPipe, Ampliar],
  templateUrl: './nuevo-pedido.html',
  styleUrl: './nuevo-pedido.css',
})
export class NuevoPedido implements OnInit {

  pasoActual = 1;

  proveedor = '';
  fecha = hoyISO();
  destino: Destino = 'bodega';
  busqueda = '';

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  proveedores: IProveedor[] = [];
  productos: ProductoPedido[] = [];

  cargando = false;
  guardando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private productoService: ProductoService,
    private proveedorService: ProveedorService,
    private pedidoService: PedidoProveedorService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // Pedido de pinturas, pinceles y otros (enlace "Pedir pinturas y materiales")
  soloMateriales = false;
  nombreTipo = nombreTipo;

  ngOnInit(): void {
    // Se escucha el parámetro porque desde el menú se puede pasar de
    // "Nuevo pedido" a "Pedir pinturas y materiales" sin salir de esta página
    this.route.queryParamMap.subscribe(parametros => {
      this.soloMateriales = parametros.get('tipo') === 'materiales';
      this.destino = this.soloMateriales ? 'local' : 'bodega';
      this.proveedor = '';
      this.busqueda = '';
      this.pasoActual = 1;
      this.cargarDatos();
    });
  }

  private cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      proveedores: this.proveedorService.getProveedores(),
      productos: this.productoService.getProductos()
    }).subscribe({
      next: ({ proveedores, productos }) => {
        // En pedidos de materiales solo aparecen proveedores de materiales o de ambos
        this.proveedores = this.soloMateriales
          ? proveedores.filter(item => item.tipo === 'materiales' || item.tipo === 'ambos')
          : proveedores;
        this.productos = productos
          .filter(producto => !this.soloMateriales || esMaterial(producto.tipo))
          .map(producto => ({
          referencia: producto.referencia,
          tipo: producto.tipo ?? 'figura',
          categoria: producto.categoria ?? '',
          nombre: producto.nombre,
          proveedor: producto.proveedor,
          imagen: producto.imagen,
          cantidad: 0,
          precioEsperado: producto.costo ?? 0   // el costo del catálogo como precio sugerido
        }));
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  // Precio máximo por figura pactado con el proveedor elegido
  get limiteProveedor(): number | null {
    return this.proveedores.find(item => item.nombre === this.proveedor)?.limite_precio ?? null;
  }

  // Cada pedido es de un solo proveedor: solo se muestran sus productos
  get productosFiltrados(): ProductoPedido[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto => {

      const coincideProveedor =
        !!this.proveedor &&
        producto.proveedor === this.proveedor;

      const coincideBusqueda =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.referencia ?? '').toLowerCase().includes(texto);

      return coincideProveedor && coincideBusqueda &&
        coincideCategoria(producto.categoria, this.categoriaSeleccionada);
    });
  }

  // Categorías de las figuras del proveedor elegido
  get categorias(): string[] {
    return categoriasDe(this.productos.filter(producto => producto.proveedor === this.proveedor));
  }

  get productosSeleccionados(): ProductoPedido[] {
    return this.productos.filter(
      producto => producto.proveedor === this.proveedor && producto.cantidad > 0
    );
  }

  get totalProductos(): number {
    return this.productosSeleccionados.length;
  }

  get totalUnidades(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) => total + producto.cantidad,
      0
    );
  }

  get precioTotal(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidad * producto.precioEsperado,
      0
    );
  }

  aumentarCantidad(producto: ProductoPedido): void {
    producto.cantidad++;
  }

  disminuirCantidad(producto: ProductoPedido): void {
    if (producto.cantidad > 0) {
      producto.cantidad--;
    }
  }

  // Al cambiar de proveedor se limpian las cantidades del anterior
  actualizarProveedor(): void {
    this.busqueda = '';

    this.productos.forEach(producto => {
      if (producto.proveedor !== this.proveedor) {
        producto.cantidad = 0;
      }
    });
  }

  continuar(): void {

    if (!this.proveedor || !this.fecha || !this.destino) {
      this.error = 'Completa la información del pedido antes de continuar.';
      return;
    }

    if (this.totalUnidades === 0) {
      this.error = 'Selecciona al menos un producto para continuar.';
      return;
    }

    this.error = '';
    this.pasoActual = 2;
    this.subirAlInicio();
  }

  volverAProductos(): void {
    this.pasoActual = 1;
    this.subirAlInicio();
  }

  // Al cambiar de paso se vuelve arriba de la página
  private subirAlInicio(): void {
    document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  guardarPedido(): void {

    const seleccionados = this.productosSeleccionados;

    if (seleccionados.length === 0) {
      alert('Agrega al menos un producto al pedido.');
      return;
    }

    const limite = this.limiteProveedor;
    const sobreLimite = limite
      ? seleccionados.filter(producto => (Number(producto.precioEsperado) || 0) > limite)
      : [];

    if (
      sobreLimite.length > 0 &&
      !confirm(
        `${sobreLimite.length} producto(s) tienen un precio esperado mayor al límite de ` +
        `$${limite?.toLocaleString('es-CO')} pactado con ${this.proveedor}. ¿Guardar de todas formas?`
      )
    ) {
      return;
    }

    this.guardando = true;
    this.error = '';

    // Listas paralelas: productos[i] -> cantidad[i] -> precio_esperado[i]
    this.pedidoService.crearPedido({
      proveedor: this.proveedor,
      productos: seleccionados.map(producto => producto.nombre),
      cantidad: seleccionados.map(producto => Number(producto.cantidad)),
      precio_esperado: seleccionados.map(producto => Number(producto.precioEsperado) || 0),
      fecha_pedido: this.fecha,
      zona_entrega: this.destino === 'bodega'
    }).subscribe({
      next: pedido => {
        this.guardando = false;
        alert(`Pedido #${String(pedido.codigo).padStart(3, '0')} registrado correctamente.`);
        this.router.navigate(['/pedidos-proveedor']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/pedidos-proveedor']);
  }

}
