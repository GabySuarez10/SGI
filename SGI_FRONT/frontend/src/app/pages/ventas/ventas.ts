import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { VentaService } from '../../services/venta.service';
import { AuthService } from '../../services/auth.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';
import { hoyISO } from '../../utils/fecha';

type TipoVenta = 'Distribución / Institucional' | 'Venta normal' | 'Mayorista';

type ModalidadVenta =
  | 'Figura cruda'
  | 'Figura en kit'
  | 'Figura pintada';

interface ProductoVenta {
  codigo: string;
  nombre: string;
  imagen: string;
  existencias: number;

  // Precios del producto según la modalidad.
  // Crudo = precios del Inventario_local; kit y pintada = crudo + recargo.
  precioCrudo: number;
  precioMayoristaCrudo: number;

  precioKit: number;
  precioMayoristaKit: number;

  precioPintada: number;
  precioMayoristaPintada: number;

  cantidad: number;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas implements OnInit {

  cliente = '';

  fecha = hoyISO();

  observacion = '';

  // Tipo general de la venta.
  tipoVenta: TipoVenta = 'Venta normal';

  // Modalidad general de la venta.
  modalidad: ModalidadVenta = 'Figura cruda';

  // Precio especial para distribución/institucional.
  // Después podremos configurarlo desde el sistema.
  precioKitDistribucion = 13000;

  // Inventario disponible de materiales.
  pinturasDisponibles = 1000;
  pincelesDisponibles = 200;

  busqueda = '';


  // Recargo que se suma al precio de la figura cruda según la modalidad.
  // Ajusta estos valores a los precios reales de Pintarte.
  recargoKit = 2300;
  recargoPintada = 4300;

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.error = '';

    this.inventarioService.getLocal().subscribe({
      next: inventario => {
        this.productos = inventario.map(item => ({
          codigo: String(item.codigo),
          nombre: item.nombre,
          imagen: item.imagen,
          existencias: item.existencias,

          precioCrudo: item.precio_venta,
          precioMayoristaCrudo: item.precio_mayorista,

          precioKit: item.precio_venta + this.recargoKit,
          precioMayoristaKit: item.precio_mayorista + this.recargoKit,

          precioPintada: item.precio_venta + this.recargoPintada,
          precioMayoristaPintada: item.precio_mayorista + this.recargoPintada,

          cantidad: 0
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

    if (!texto) {
      return this.productos;
    }

    return this.productos.filter(producto =>
      producto.nombre.toLowerCase().includes(texto) ||
      producto.codigo.toLowerCase().includes(texto)
    );
  }


  get productosSeleccionados(): ProductoVenta[] {

    return this.productos.filter(
      producto => producto.cantidad > 0
    );
  }


  // ================================
  // CANTIDADES
  // ================================

  get totalUnidades(): number {

    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidad,
      0
    );
  }


  get totalKits(): number {

    if (this.modalidad !== 'Figura en kit') {
      return 0;
    }

    return this.totalUnidades;
  }


  // Cada kit necesita 5 pinturas.
  get pinturasNecesarias(): number {

    return this.totalKits * 5;
  }


  // Cada kit necesita 1 pincel.
  get pincelesNecesarios(): number {

    return this.totalKits;
  }


  // ================================
  // PRECIOS
  // ================================

  getPrecio(producto: ProductoVenta): number {

    // Distribución / Institucional
    //
    // Para este tipo de venta,
    // el kit tiene un precio especial
    // igual para todas las figuras.
    if (
      this.tipoVenta === 'Distribución / Institucional' &&
      this.modalidad === 'Figura en kit'
    ) {
      return this.precioKitDistribucion;
    }


    // Venta normal
    if (this.tipoVenta === 'Venta normal') {

      if (this.modalidad === 'Figura en kit') {
        return producto.precioKit;
      }

      if (this.modalidad === 'Figura pintada') {
        return producto.precioPintada;
      }

      return producto.precioCrudo;
    }


    // Mayorista
    if (this.tipoVenta === 'Mayorista') {

      if (this.modalidad === 'Figura en kit') {
        return producto.precioMayoristaKit;
      }

      if (this.modalidad === 'Figura pintada') {
        return producto.precioMayoristaPintada;
      }

      return producto.precioMayoristaCrudo;
    }


    return producto.precioCrudo;
  }


  getSubtotal(producto: ProductoVenta): number {

    return this.getPrecio(producto) * producto.cantidad;
  }


  get totalVenta(): number {

    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + this.getSubtotal(producto),
      0
    );
  }


  // ================================
  // CAMBIO DE MODALIDAD
  // ================================

  cambiarModalidad(): void {

    /*
      La modalidad se aplica a toda la venta.

      Ejemplo:
      Si seleccionamos "Figura en kit",
      todos los productos agregados a esta salida
      serán considerados kits.
    */

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

      alert(
        'Por favor, ingresa el cliente o destino.'
      );

      return;
    }


    if (this.productosSeleccionados.length === 0) {

      alert(
        'Debes seleccionar al menos un producto.'
      );

      return;
    }


    // Validar pinturas únicamente si es KIT.
    if (
      this.modalidad === 'Figura en kit' &&
      this.pinturasNecesarias > this.pinturasDisponibles
    ) {

      alert(
        `No hay suficientes pinturas.\n\n` +
        `Necesarias: ${this.pinturasNecesarias}\n` +
        `Disponibles: ${this.pinturasDisponibles}`
      );

      return;
    }


    // Validar pinceles únicamente si es KIT.
    if (
      this.modalidad === 'Figura en kit' &&
      this.pincelesNecesarios > this.pincelesDisponibles
    ) {

      alert(
        `No hay suficientes pinceles.\n\n` +
        `Necesarios: ${this.pincelesNecesarios}\n` +
        `Disponibles: ${this.pincelesDisponibles}`
      );

      return;
    }


    const seleccionados = this.productosSeleccionados;

    const detalle = seleccionados
      .map(producto =>
        `${producto.cantidad} × ${producto.nombre}`
      )
      .join('\n');

    // La tabla Venta no tiene columnas de tipo ni modalidad:
    // se guardan al inicio de la observación.
    const observacion =
      `[${this.tipoVenta} · ${this.modalidad}]` +
      (this.observacion.trim() ? ` ${this.observacion.trim()}` : '');

    const resumen =
      `Salida registrada correctamente.\n\n` +

      `Cliente / destino:\n${this.cliente}\n\n` +

      `Tipo de venta:\n${this.tipoVenta}\n\n` +

      `Modalidad:\n${this.modalidad}\n\n` +

      `${detalle}\n\n` +

      `Total de unidades: ${this.totalUnidades}\n` +

      `Kits: ${this.totalKits}\n` +

      `Pinturas utilizadas: ${this.pinturasNecesarias}\n` +

      `Pinceles utilizados: ${this.pincelesNecesarios}\n\n` +

      `Total: $${this.totalVenta.toLocaleString('es-CO')}`;

    this.guardando = true;
    this.error = '';

    // Listas paralelas: producto[i] -> cantidad[i] -> precio_unitario[i]
    this.ventaService.registrarVenta({
      producto: seleccionados.map(producto => producto.nombre),
      cantidad: seleccionados.map(producto => producto.cantidad),
      precio_unitario: seleccionados.map(producto => this.getPrecio(producto)),
      cliente: this.cliente.trim(),
      observacion,
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