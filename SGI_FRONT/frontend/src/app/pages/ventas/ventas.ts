import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventarioService } from '../../services/inventario.service';
import { VentaService } from '../../services/venta.service';
import { AuthService } from '../../services/auth.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import {
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import {
  MODALIDADES_VENTA,
  ModalidadVenta,
  esModalidadKit,
  precioPorModalidad
} from '../../utils/precios';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';
import { hoyISO } from '../../utils/fecha';
import {
  VistaProductos,
  categoriasDe,
  coincideCategoria,
  coincideVista,
  nombreTipo
} from '../../utils/tipos';

interface ProductoVenta {
  codigo: string;
  referencia: string;
  tipo: string;        // figura | pintura | pincel | otro
  categoria: string;   // solo figuras: Navidad, Materas...
  nombre: string;
  imagen: string;
  existencias: number;

  // Precios del producto en el local (ya incluyen el envío)
  precioCrudo: number;
  precioMayor: number;

  cantidad: number;

  // Solo en modalidad "Pintada": adicional propio de esta figura
  // (null = usa el adicional general de la venta)
  adicionalPintada: number | null;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, Ampliar],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas implements OnInit {

  cliente = '';

  fecha = hoyISO();

  observacion = '';

  // Detal, Pintar en el local, Kit para llevar, Pintada, Por mayor (local),
  // Empresa por mayor o Empresa con contrato
  readonly modalidades = MODALIDADES_VENTA;
  modalidad: ModalidadVenta = 'Detal';

  // Valores editables en Configuración (precio del kit por contrato, etc.)
  valores: IValoresConfiguracion = VALORES_POR_DEFECTO;

  // Modalidad "Pintada": valor que se suma al precio crudo de cada figura.
  // Se toma el sugerido de Configuración y se puede cambiar en cada venta.
  adicionalPintadaGeneral = VALORES_POR_DEFECTO.valor_pintada;

  busqueda = '';

  // Pestañas del listado de productos
  vista: VistaProductos = 'figuras';
  readonly vistasVenta: { valor: VistaProductos; nombre: string }[] = [
    { valor: 'figuras', nombre: 'Figuras' },
    { valor: 'materiales', nombre: 'Pinturas, pinceles y otros' },
    { valor: 'todos', nombre: 'Todo' }
  ];
  nombreTipo = nombreTipo;

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  // Productos del local (vienen de GET /api/inventario-local)
  productos: ProductoVenta[] = [];

  cargando = false;
  guardando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private inventarioService: InventarioService,
    private ventaService: VentaService,
    private authService: AuthService,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      inventario: this.inventarioService.getLocal(),
      configuracion: this.configuracionService.getConfiguracion()
    }).subscribe({
      next: ({ inventario, configuracion }) => {
        this.valores = configuracion.valores;
        this.adicionalPintadaGeneral = configuracion.valores.valor_pintada;
        this.productos = inventario.map(item => ({
          codigo: String(item.codigo),
          referencia: item.referencia ?? '',
          tipo: item.tipo ?? 'figura',
          categoria: item.categoria ?? '',
          nombre: item.nombre,
          imagen: item.imagen,
          existencias: item.existencias,
          precioCrudo: item.precio_venta,
          precioMayor: item.precio_mayorista,
          cantidad: 0,
          adicionalPintada: null
        }));
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }


  // ================================
  // PRODUCTOS
  // ================================

  get productosFiltrados(): ProductoVenta[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.productos.filter(producto =>
      coincideVista(producto.tipo, this.vista) &&
      (!this.categoriaSeleccionada ||
        (producto.tipo === 'figura' && coincideCategoria(producto.categoria, this.categoriaSeleccionada))) && (
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        producto.referencia.toLowerCase().includes(texto) ||
        producto.codigo.toLowerCase().includes(texto)
      )
    );
  }

  get categorias(): string[] {
    return categoriasDe(this.productos);
  }

  // Cuántos productos hay seleccionados en cada pestaña
  contarSeleccionados(vista: VistaProductos): number {
    return this.productosSeleccionados.filter(producto => coincideVista(producto.tipo, vista)).length;
  }


  get productosSeleccionados(): ProductoVenta[] {
    return this.productos.filter(producto => producto.cantidad > 0);
  }


  // ================================
  // CANTIDADES Y KITS
  // ================================

  get esPintada(): boolean {
    return this.modalidad === 'Pintada';
  }

  get esKit(): boolean {
    return esModalidadKit(this.modalidad);
  }

  get totalUnidades(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) => total + producto.cantidad,
      0
    );
  }

  // Los kits se cuentan solo por las figuras vendidas
  get totalKits(): number {
    if (!this.esKit) {
      return 0;
    }
    return this.productosSeleccionados
      .filter(producto => producto.tipo === 'figura')
      .reduce((total, producto) => total + producto.cantidad, 0);
  }

  // Existencias reales de pinturas y pinceles en el local
  get pinturasDisponibles(): number {
    return this.productos
      .filter(producto => producto.tipo === 'pintura')
      .reduce((total, producto) => total + producto.existencias, 0);
  }

  get pincelesDisponibles(): number {
    return this.productos
      .filter(producto => producto.tipo === 'pincel')
      .reduce((total, producto) => total + producto.existencias, 0);
  }

  get pinturasNecesarias(): number {
    return this.totalKits * this.valores.pinturas_por_kit;
  }

  get pincelesNecesarios(): number {
    return this.totalKits * this.valores.pinceles_por_kit;
  }


  // ================================
  // PRECIOS
  // ================================

  // Adicional de "Pintada" para esta figura (el propio o el general)
  getAdicionalPintada(producto: ProductoVenta): number {
    const propio = producto.adicionalPintada;
    return propio === null || `${propio}` === ''
      ? Number(this.adicionalPintadaGeneral) || 0
      : Number(propio) || 0;
  }

  getPrecio(producto: ProductoVenta): number {
    // Pinturas, pinceles y otros: precio de detal, o por mayor en ventas por mayor
    if (producto.tipo !== 'figura') {
      return this.modalidad === 'Por mayor (local)' || this.modalidad === 'Empresa por mayor'
        ? producto.precioMayor
        : producto.precioCrudo;
    }
    return precioPorModalidad(
      this.modalidad,
      producto.precioCrudo,
      producto.precioMayor,
      this.valores,
      this.getAdicionalPintada(producto)
    );
  }

  // Al cambiar el adicional general, las figuras sin valor propio lo toman
  restablecerAdicional(producto: ProductoVenta): void {
    producto.adicionalPintada = null;
  }

  getSubtotal(producto: ProductoVenta): number {
    return this.getPrecio(producto) * producto.cantidad;
  }

  get totalVenta(): number {
    return this.productosSeleccionados.reduce(
      (total, producto) => total + this.getSubtotal(producto),
      0
    );
  }

  // Texto que explica qué precio se está usando
  get descripcionPrecio(): string {
    switch (this.modalidad) {
      case 'Por mayor (local)':
      case 'Empresa por mayor':
        return 'Precio por mayor';
      case 'Pintar en el local':
        return `Precio crudo + $${this.valores.valor_pintar_local.toLocaleString('es-CO')} por pintar en el local`;
      case 'Kit para llevar':
        return `Precio crudo + $${this.valores.valor_kit_local.toLocaleString('es-CO')} del kit`;
      case 'Pintada':
        return `Precio crudo + adicional por pintada`;
      case 'Empresa con contrato':
        return `Kit de contrato: $${this.valores.precio_kit_contrato.toLocaleString('es-CO')}`;
      default:
        return 'Precio crudo (figura en yeso blanco)';
    }
  }


  // ================================
  // CANTIDAD
  // ================================

  aumentarCantidad(producto: ProductoVenta): void {
    if (producto.cantidad < producto.existencias) {
      producto.cantidad++;
    }
  }

  disminuirCantidad(producto: ProductoVenta): void {
    if (producto.cantidad > 0) {
      producto.cantidad--;
    }
  }


  // ================================
  // REGISTRAR SALIDA
  // ================================

  registrarSalida(): void {

    if (!this.cliente.trim()) {
      alert('Por favor, ingresa el cliente o destino.');
      return;
    }

    if (this.productosSeleccionados.length === 0) {
      alert('Debes seleccionar al menos un producto.');
      return;
    }

    if (
      this.esPintada &&
      this.productosSeleccionados.some(
        producto => producto.tipo === 'figura' && this.getAdicionalPintada(producto) < 0
      )
    ) {
      alert('El valor adicional por figura pintada no puede ser negativo.');
      return;
    }

    if (this.esKit && this.pinturasNecesarias > this.pinturasDisponibles) {
      alert(
        `No hay suficientes pinturas.\n\n` +
        `Necesarias: ${this.pinturasNecesarias}\n` +
        `Disponibles: ${this.pinturasDisponibles}`
      );
      return;
    }

    if (this.esKit && this.pincelesNecesarios > this.pincelesDisponibles) {
      alert(
        `No hay suficientes pinceles.\n\n` +
        `Necesarios: ${this.pincelesNecesarios}\n` +
        `Disponibles: ${this.pincelesDisponibles}`
      );
      return;
    }

    const seleccionados = this.productosSeleccionados;

    const detalle = seleccionados
      .map(producto => `${producto.cantidad} × ${producto.nombre}`)
      .join('\n');

    const resumen =
      `Salida registrada correctamente.\n\n` +
      `Cliente / destino:\n${this.cliente}\n\n` +
      `Modalidad:\n${this.modalidad}\n\n` +
      `${detalle}\n\n` +
      (this.esPintada
        ? 'Adicional por pintada: ' +
          seleccionados
            .filter(producto => producto.tipo === 'figura')
            .map(producto => `$${this.getAdicionalPintada(producto).toLocaleString('es-CO')}`)
            .join(', ') + '\n'
        : '') +
      `Total de unidades: ${this.totalUnidades}\n` +
      (this.esKit
        ? `Kits: ${this.totalKits}\n` +
          `Pinturas utilizadas: ${this.pinturasNecesarias}\n` +
          `Pinceles utilizados: ${this.pincelesNecesarios}\n`
        : '') +
      `\nTotal: $${this.totalVenta.toLocaleString('es-CO')}`;

    this.guardando = true;
    this.error = '';

    // Listas paralelas: producto[i] -> cantidad[i] -> precio_unitario[i]
    this.ventaService.registrarVenta({
      producto: seleccionados.map(producto => producto.nombre),
      cantidad: seleccionados.map(producto => producto.cantidad),
      precio_unitario: seleccionados.map(producto => this.getPrecio(producto)),
      modalidad: this.modalidad,
      cliente: this.cliente.trim(),
      observacion: this.observacion.trim(),
      usuario: this.authService.usuarioActual?.nombre ?? '',
      fecha: this.fecha
    }).subscribe({
      next: () => {
        this.guardando = false;
        alert(resumen);

        // Limpiar el formulario y recargar existencias actualizadas
        this.cliente = '';
        this.observacion = '';
        this.busqueda = '';
        this.cargarProductos();
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }

}
