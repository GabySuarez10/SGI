import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';
import { hoyISO } from '../../utils/fecha';

// Producto del catálogo con la cantidad y el precio que se van a pedir
interface ProductoPedido {
  referencia: string;
  nombre: string;
  proveedor: string;
  imagen: string;
  cantidad: number;
  precioEsperado: number;
}

type Destino = '' | 'bodega' | 'local';

@Component({
  selector: 'app-nuevo-pedido',
  imports: [FormsModule, NgFor, NgIf, DecimalPipe],
  templateUrl: './nuevo-pedido.html',
  styleUrl: './nuevo-pedido.css',
})
export class NuevoPedido implements OnInit {

  pasoActual = 1;

  proveedor = '';
  fecha = hoyISO();
  destino: Destino = 'bodega';
  busqueda = '';

  proveedores: string[] = [];
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargando = true;

    forkJoin({
      proveedores: this.proveedorService.getProveedores(),
      productos: this.productoService.getProductos()
    }).subscribe({
      next: ({ proveedores, productos }) => {
        this.proveedores = proveedores.map(proveedor => proveedor.nombre);
        this.productos = productos.map(producto => ({
          referencia: producto.referencia,
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

      return coincideProveedor && coincideBusqueda;
    });
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
  }

  volverAProductos(): void {
    this.pasoActual = 1;
  }

  guardarPedido(): void {

    const seleccionados = this.productosSeleccionados;

    if (seleccionados.length === 0) {
      alert('Agrega al menos un producto al pedido.');
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
