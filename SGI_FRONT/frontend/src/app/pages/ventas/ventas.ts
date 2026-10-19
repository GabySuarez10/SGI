import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventarioService } from '../../services/inventario.service';
import { VentaService } from '../../services/venta.service';
import { AuthService } from '../../services/auth.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import {
  MODALIDADES_VENTA,
  ModalidadVenta,
  esModalidadKit,
  precioEditableEnVenta,
  precioPorModalidad
} from '../../utils/precios';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { Escaner } from '../../components/escaner/escaner';
import { Facturar } from '../../components/facturar/facturar';
import { IMaterialesKits, IVenta, esMaterialDeKit } from '../../interfaces/venta.interface';
import { CajaService } from '../../services/caja.service';
import { ICaja, MEDIOS_PAGO, MedioPago } from '../../interfaces/caja.interface';
import { RouterLink } from '@angular/router';
import { buscarPorCodigo } from '../../utils/codigos';
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
  precioPintarLocal: number;   // solo figuras (sugerido crudo × 2, editable en el producto)
  precioTerminada: number;     // solo figuras (sugerido pintar en el local × 2)

  cantidad: number;

  // "Pintar en el local" y "Pintada": precio escrito a mano en esta venta
  // (null = usa el precio guardado en el producto)
  precioManual: number | null;

  // "Kit para llevar": valor del kit
  kitProducto: number;        // el del producto (según su tamaño)
  kitCategoria: string;       // tamaño de kit guardado en el producto
  kitElegido: string;         // '' = el del producto · nombre de la tabla · 'otro'
  kitManual: number | null;   // valor escrito a mano (con 'otro')
}

const KIT_OTRO = 'otro';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Ampliar, Escaner, Facturar],
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

  // Kit para llevar por tamaño (Pequeño $6.000, Mediano $8.000...)
  tarifasKit: ITarifaEnvio[] = [];


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

  // ================================
  // CAJA Y PAGO
  // ================================

  // Caja de hoy (null = aún no se abre)
  cajaHoy: ICaja | null = null;
  cajaRevisada = false;

  readonly mediosPago = MEDIOS_PAGO;
  // Cómo paga el cliente. Pago mixto: varias líneas; la última cubre el resto.
  pagos: { medio: MedioPago; valor: number | null }[] = [{ medio: 'Efectivo', valor: null }];
  recibido: number | null = null;    // efectivo que entrega el cliente

  // Pinturas y pinceles para kits (local y bodega)
  materialesKits: IMaterialesKits | null = null;

  // Venta recién registrada: abre la ventana para facturarla
  ventaRegistrada: IVenta | null = null;

  // Resultado del último escaneo
  mensajeEscaneo = '';
  estadoEscaneo: 'ok' | 'error' | '' = '';
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private inventarioService: InventarioService,
    private ventaService: VentaService,
    private authService: AuthService,
    private configuracionService: ConfiguracionService,
    private cajaService: CajaService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      inventario: this.inventarioService.getLocal(),
      configuracion: this.configuracionService.getConfiguracion(),
      kits: this.ventaService.getMaterialesKits(),
      caja: this.cajaService.getHoy()
    }).subscribe({
      next: ({ inventario, configuracion, kits, caja }) => {
        this.cajaHoy = caja.caja;
        this.cajaRevisada = true;
        this.materialesKits = kits;
        this.valores = configuracion.valores;
        this.tarifasKit = configuracion.tarifas_kit ?? [];
        // Las pinturas y pinceles para kits no se venden sueltos: se descuentan solos
        this.productos = inventario.filter(item => !esMaterialDeKit(item.referencia)).map(item => ({
          codigo: String(item.codigo),
          referencia: item.referencia ?? '',
          tipo: item.tipo ?? 'figura',
          categoria: item.categoria ?? '',
          nombre: item.nombre,
          imagen: item.imagen,
          existencias: item.existencias,
          precioCrudo: item.precio_venta,
          precioMayor: item.precio_mayorista,
          precioPintarLocal: item.precio_pintar_local ?? item.precio_venta * 2,
          precioTerminada: item.precio_terminada ?? item.precio_venta * 4,
          cantidad: 0,
          precioManual: null,
          kitProducto: item.precio_kit ?? configuracion.valores.valor_kit_local,
          kitCategoria: item.kit_categoria ?? '',
          kitElegido: '',
          kitManual: null
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

  // Al cambiar de modalidad se descartan los precios escritos a mano
  cambiarModalidad(modalidad: ModalidadVenta): void {
    if (modalidad === this.modalidad) {
      return;
    }
    this.modalidad = modalidad;
    this.productos.forEach(producto => {
      producto.precioManual = null;
      producto.kitElegido = '';
      producto.kitManual = null;
    });
  }

  // "Pintar en el local" y "Pintada": el precio de cada figura se puede cambiar
  get precioEditable(): boolean {
    return precioEditableEnVenta(this.modalidad);
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
  // Kit para llevar: del local · Empresa con contrato (recreacionales): de la bodega
  get lugarKits(): 'local' | 'bodega' {
    return this.modalidad === 'Empresa con contrato' ? 'bodega' : 'local';
  }

  get nombreLugarKits(): string {
    return this.lugarKits === 'bodega' ? 'Bodega' : 'Local';
  }

  get pinturasDisponibles(): number {
    return this.materialesKits?.['KIT-PINTURAS']?.[this.lugarKits] ?? 0;
  }

  get pincelesDisponibles(): number {
    return this.materialesKits?.['KIT-PINCELES']?.[this.lugarKits] ?? 0;
  }

  get materialesKitsExisten(): boolean {
    return !!this.materialesKits?.['KIT-PINTURAS']?.existe && !!this.materialesKits?.['KIT-PINCELES']?.existe;
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

  // Precio que trae el producto para la modalidad elegida
  getPrecioSugerido(producto: ProductoVenta): number {
    // Pinturas, pinceles y otros: precio de detal, o por mayor en ventas por mayor
    if (producto.tipo !== 'figura') {
      return this.modalidad === 'Por mayor (local)' || this.modalidad === 'Empresa por mayor'
        ? producto.precioMayor
        : producto.precioCrudo;
    }
    return precioPorModalidad(
      this.modalidad,
      {
        crudo: producto.precioCrudo,
        mayor: producto.precioMayor,
        pintarLocal: producto.precioPintarLocal,
        terminada: producto.precioTerminada,
        kit: this.getKit(producto)
      },
      this.valores
    );
  }

  // ¿Esta figura tiene un precio escrito a mano en esta venta?
  tienePrecioManual(producto: ProductoVenta): boolean {
    return this.precioEditable &&
      producto.tipo === 'figura' &&
      producto.precioManual !== null &&
      `${producto.precioManual}` !== '';
  }

  getPrecio(producto: ProductoVenta): number {
    return this.tienePrecioManual(producto)
      ? Number(producto.precioManual) || 0
      : this.getPrecioSugerido(producto);
  }

  // Valor de cada línea de pago: la última siempre es "el resto"
  valorPago(indice: number): number {
    if (indice === this.pagos.length - 1) {
      const otros = this.pagos.slice(0, -1).reduce((total, pago) => total + (Number(pago.valor) || 0), 0);
      return this.totalVenta - otros;
    }
    return Number(this.pagos[indice].valor) || 0;
  }

  get pagoValido(): boolean {
    return this.pagos.every((_, i) => this.valorPago(i) >= 0);
  }

  get efectivoEnPago(): number {
    return this.pagos.reduce((total, pago, i) => total + (pago.medio === 'Efectivo' ? this.valorPago(i) : 0), 0);
  }

  get cambio(): number {
    return this.recibido ? Math.max(Number(this.recibido) - this.efectivoEnPago, 0) : 0;
  }

  agregarMedioPago(): void {
    // La línea que era "el resto" queda con su valor actual y la nueva toma el resto
    const ultimo = this.pagos.length - 1;
    this.pagos[ultimo].valor = this.valorPago(ultimo);
    const usado = new Set(this.pagos.map(pago => pago.medio));
    const siguiente = MEDIOS_PAGO.find(medio => !usado.has(medio)) ?? 'Efectivo';
    this.pagos.push({ medio: siguiente, valor: null });
  }

  quitarMedioPago(indice: number): void {
    this.pagos.splice(indice, 1);
    if (this.pagos.length) {
      this.pagos[this.pagos.length - 1].valor = null;
    }
  }

  get cajaCerrada(): boolean {
    return this.cajaHoy?.estado === 'cerrada';
  }

  restablecerPrecio(producto: ProductoVenta): void {
    producto.precioManual = null;
  }


  // ================================
  // KIT PARA LLEVAR POR TAMAÑO
  // ================================

  readonly kitOtro = KIT_OTRO;

  get esKitLlevar(): boolean {
    return this.modalidad === 'Kit para llevar';
  }

  // Valor del kit de esta figura: el del producto, otro tamaño o uno escrito a mano
  getKit(producto: ProductoVenta): number {
    if (producto.kitElegido === KIT_OTRO) {
      return producto.kitManual === null || `${producto.kitManual}` === ''
        ? producto.kitProducto
        : Number(producto.kitManual) || 0;
    }
    if (producto.kitElegido) {
      return this.tarifasKit.find(tarifa => tarifa.nombre === producto.kitElegido)?.precio ?? producto.kitProducto;
    }
    return producto.kitProducto;
  }

  // Texto de la opción "el del producto"
  textoKitProducto(producto: ProductoVenta): string {
    const tamano = producto.kitCategoria && producto.kitCategoria !== 'Personalizado' ? ` (${producto.kitCategoria})` : '';
    return `El de la figura${tamano} · $${producto.kitProducto.toLocaleString('es-CO')}`;
  }

  elegirKit(producto: ProductoVenta, opcion: string): void {
    producto.kitElegido = opcion;
    if (opcion === KIT_OTRO && producto.kitManual === null) {
      producto.kitManual = producto.kitProducto;
    }
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
        return 'Precio "pintar en el local" de cada figura (editable)';
      case 'Kit para llevar':
        return 'Precio crudo + kit según el tamaño de la figura';
      case 'Pintada':
        return 'Precio "figura terminada" de cada figura (editable)';
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

  // Escanear una etiqueta suma una unidad de ese producto a la venta
  agregarPorCodigo(codigo: string): void {
    const producto = buscarPorCodigo(this.productos, codigo);
    if (!producto) {
      this.estadoEscaneo = 'error';
      this.mensajeEscaneo = `"${codigo}" no está en el inventario del local.`;
      return;
    }
    if (producto.cantidad >= producto.existencias) {
      this.estadoEscaneo = 'error';
      this.mensajeEscaneo = producto.existencias === 0
        ? `${producto.nombre}: no hay unidades en el local.`
        : `${producto.nombre}: ya agregaste las ${producto.existencias} unidades que hay en el local.`;
      return;
    }
    producto.cantidad++;
    this.estadoEscaneo = 'ok';
    this.mensajeEscaneo =
      `✓ ${producto.nombre} · ${producto.cantidad} en esta venta · ` +
      `$${this.getPrecio(producto).toLocaleString('es-CO')} c/u`;
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
      this.productosSeleccionados.some(producto => this.getPrecio(producto) < 0)
    ) {
      alert('El precio de una figura no puede ser negativo.');
      return;
    }

    if (this.esKit && this.pinturasNecesarias > this.pinturasDisponibles) {
      alert(
        `No hay suficientes pinturas para kits (${this.nombreLugarKits}).\n\n` +
        `Necesarias: ${this.pinturasNecesarias}\n` +
        `Disponibles: ${this.pinturasDisponibles}`
      );
      return;
    }

    if (this.esKit && this.pincelesNecesarios > this.pincelesDisponibles) {
      alert(
        `No hay suficientes pinceles para kits (${this.nombreLugarKits}).\n\n` +
        `Necesarios: ${this.pincelesNecesarios}\n` +
        `Disponibles: ${this.pincelesDisponibles}`
      );
      return;
    }

    if (this.cajaCerrada) {
      alert('La caja de hoy ya está cerrada. Reábrela en Caja para registrar más ventas.');
      return;
    }

    if (!this.pagoValido) {
      alert('Los valores del pago superan el total de la venta. Revisa los medios de pago.');
      return;
    }

    if (this.efectivoEnPago > 0 && this.recibido && Number(this.recibido) < this.efectivoEnPago) {
      alert('El efectivo recibido es menor que lo que se paga en efectivo.');
      return;
    }

    const seleccionados = this.productosSeleccionados;

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
      fecha: this.fecha,
      pagos: this.pagos
        .map((pago, i) => ({ medio: pago.medio, valor: this.valorPago(i) }))
        .filter(pago => pago.valor > 0),
      recibido: this.efectivoEnPago > 0 && this.recibido ? Number(this.recibido) : null
    }).subscribe({
      next: venta => {
        this.guardando = false;
        // Ofrece emitir la tirilla POS o la factura electrónica de esta venta
        this.ventaRegistrada = venta;

        // Limpiar el formulario y recargar existencias actualizadas
        this.cliente = '';
        this.mensajeEscaneo = '';
        this.pagos = [{ medio: 'Efectivo', valor: null }];
        this.recibido = null;
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
