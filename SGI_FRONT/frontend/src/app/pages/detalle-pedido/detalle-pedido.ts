import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IPedidoProveedor } from '../../interfaces/pedido-proveedor.interface';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { ProductoService } from '../../services/producto.service';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

// Una fila de la tabla: se arma juntando la posición i de cada lista del pedido
interface ProductoPedido {
  nombre: string;
  referencia: string;
  imagen: string;
  solicitado: number;      // lo que se pidió
  facturado: number;       // lo que dice la factura del proveedor
  recibido: number;        // lo que llegó (incluye dañadas)
  danado: number;
  precioEsperado: number;  // precio acordado al hacer el pedido
  precioFactura: number;   // precio que cobra la factura
}

interface Problema {
  texto: string;
  nivel: 'mal' | 'medio';
}

@Component({
  selector: 'app-detalle-pedido',
  imports: [NgFor, NgIf, DecimalPipe, DatePipe, FormsModule, Ampliar],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.css',
})
export class DetallePedido implements OnInit {

  pedido: IPedidoProveedor | null = null;
  productos: ProductoPedido[] = [];
  observaciones = '';

  // true = Bodega, false = Local
  destinoSeleccionado = true;
  cambiandoDestino = false;

  cargando = false;
  guardando = false;
  eliminando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidoService: PedidoProveedorService,
    private productoService: ProductoService
  ) {}

  ngOnInit(): void {
    const codigo = Number(this.route.snapshot.paramMap.get('codigo'));

    if (!codigo) {
      this.router.navigate(['/pedidos-proveedor']);
      return;
    }

    this.cargando = true;

    forkJoin({
      pedido: this.pedidoService.getPedido(codigo),
      catalogo: this.productoService.getProductos()
    }).subscribe({
      next: ({ pedido, catalogo }) => {
        // Imagen y referencia se buscan en el catálogo por el nombre del producto
        const porNombre = new Map(
          catalogo.map(producto => [producto.nombre.toLowerCase(), producto])
        );

        this.productos = pedido.productos.map((nombre, i) => {
          const producto = porNombre.get(nombre.toLowerCase());
          const solicitado = pedido.cantidad[i] ?? 0;
          const precioEsperado = pedido.precio_esperado[i] ?? 0;
          return {
            nombre,
            referencia: producto?.referencia ?? '',
            imagen: producto?.imagen ?? '',
            solicitado,
            precioEsperado,
            // Si está pendiente se propone que la factura y la entrega coinciden con el pedido
            facturado: pedido.estado ? (pedido.facturado[i] ?? solicitado) : solicitado,
            recibido: pedido.estado ? (pedido.llegan[i] ?? 0) : solicitado,
            danado: pedido.estado ? (pedido.danados[i] ?? 0) : 0,
            precioFactura: pedido.estado ? (pedido.precio_factura[i] || precioEsperado) : precioEsperado
          };
        });

        this.mostrarPedido(pedido);
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  private mostrarPedido(pedido: IPedidoProveedor): void {
    this.pedido = pedido;
    this.destinoSeleccionado = pedido.zona_entrega;
    this.observaciones = pedido.observaciones ?? '';
  }

  // Un pedido ya recibido solo se consulta (salvo el destino)
  get soloLectura(): boolean {
    return !!this.pedido?.estado;
  }

  get numeroPedido(): string {
    return String(this.pedido?.codigo ?? '').padStart(3, '0');
  }

  // Precio máximo por figura pactado con el proveedor
  get limite(): number | null {
    return this.pedido?.limite_precio ?? null;
  }

  volver(): void {
    this.router.navigate(['/pedidos-proveedor']);
  }

  eliminarPedido(): void {
    if (!this.pedido) {
      return;
    }
    if (!confirm(`¿Eliminar el pedido #${this.numeroPedido} de ${this.pedido.proveedor}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.eliminando = true;
    this.pedidoService.eliminarPedido(this.pedido.codigo).subscribe({
      next: () => {
        this.eliminando = false;
        alert(`El pedido #${this.numeroPedido} se eliminó.`);
        this.volver();
      },
      error: err => {
        this.eliminando = false;
        alert(mensajeDeError(err));
      }
    });
  }

  // ================================
  // DESTINO (Bodega / Local)
  // ================================

  cambiarDestino(): void {
    if (!this.pedido) {
      return;
    }

    const nuevo = this.destinoSeleccionado;
    const nombreNuevo = nuevo ? 'Bodega' : 'Local';

    if (
      this.pedido.estado &&
      !confirm(
        `El pedido ya fue recibido. Las unidades en buen estado se moverán a ${nombreNuevo}. ¿Continuar?`
      )
    ) {
      this.destinoSeleccionado = this.pedido.zona_entrega;
      return;
    }

    this.cambiandoDestino = true;

    this.pedidoService.cambiarDestino(this.pedido.codigo, nuevo).subscribe({
      next: pedido => {
        this.cambiandoDestino = false;
        if (this.pedido) {
          this.pedido = { ...this.pedido, zona_entrega: pedido.zona_entrega };
        }
        this.destinoSeleccionado = pedido.zona_entrega;
      },
      error: err => {
        this.cambiandoDestino = false;
        this.destinoSeleccionado = this.pedido?.zona_entrega ?? true;
        alert(mensajeDeError(err));
      }
    });
  }

  // ================================
  // COMPARATIVA E INCONSISTENCIAS
  // ================================

  superaLimite(producto: ProductoPedido): boolean {
    return !!this.limite && (Number(producto.precioFactura) || 0) > this.limite;
  }

  problemas(producto: ProductoPedido): Problema[] {
    const lista: Problema[] = [];
    const facturado = Number(producto.facturado) || 0;
    const recibido = Number(producto.recibido) || 0;
    const precioFactura = Number(producto.precioFactura) || 0;

    if (this.superaLimite(producto)) {
      lista.push({ texto: `Supera límite $${this.limite?.toLocaleString('es-CO')}`, nivel: 'mal' });
    }
    if (precioFactura !== producto.precioEsperado) {
      lista.push({
        texto: precioFactura > producto.precioEsperado ? 'Precio mayor al esperado' : 'Precio menor al esperado',
        nivel: precioFactura > producto.precioEsperado ? 'mal' : 'medio'
      });
    }
    if (facturado !== recibido) {
      lista.push({ texto: `Facturó ${facturado}, llegaron ${recibido}`, nivel: 'mal' });
    }
    if (facturado !== producto.solicitado) {
      lista.push({ texto: `Facturó ${facturado} de ${producto.solicitado}`, nivel: 'medio' });
    }
    if ((Number(producto.danado) || 0) > 0) {
      lista.push({ texto: `${producto.danado} dañada(s)`, nivel: 'mal' });
    }
    return lista;
  }

  get totalInconsistencias(): number {
    return this.productos.reduce((total, producto) => total + this.problemas(producto).length, 0);
  }

  getFaltantes(producto: ProductoPedido): number {
    return Math.max(producto.solicitado - producto.recibido, 0);
  }

  getSobrantes(producto: ProductoPedido): number {
    return Math.max(producto.recibido - producto.solicitado, 0);
  }

  getTotalProducto(producto: ProductoPedido): number {
    return producto.solicitado * producto.precioEsperado;
  }

  getTotalSolicitado(): number {
    return this.productos.reduce((total, producto) => total + producto.solicitado, 0);
  }

  getTotalFacturado(): number {
    return this.productos.reduce((total, producto) => total + (Number(producto.facturado) || 0), 0);
  }

  getTotalEsperado(): number {
    return this.productos.reduce((total, producto) => total + this.getTotalProducto(producto), 0);
  }

  getTotalFacturadoValor(): number {
    return this.productos.reduce(
      (total, producto) =>
        total + (Number(producto.facturado) || 0) * (Number(producto.precioFactura) || 0),
      0
    );
  }

  getTotalRecibido(): number {
    return this.productos.reduce((total, producto) => total + (Number(producto.recibido) || 0), 0);
  }

  getTotalFaltantes(): number {
    return this.productos.reduce((total, producto) => total + this.getFaltantes(producto), 0);
  }

  getTotalSobrantes(): number {
    return this.productos.reduce((total, producto) => total + this.getSobrantes(producto), 0);
  }

  getTotalDanados(): number {
    return this.productos.reduce((total, producto) => total + (Number(producto.danado) || 0), 0);
  }

  getValorFaltante(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getFaltantes(producto) * producto.precioEsperado,
      0
    );
  }

  getValorDanado(): number {
    return this.productos.reduce(
      (total, producto) => total + (Number(producto.danado) || 0) * (Number(producto.precioFactura) || 0),
      0
    );
  }

  getCostoUtilizable(): number {
    return this.productos.reduce((total, producto) => {
      const utilizables = Math.max((Number(producto.recibido) || 0) - (Number(producto.danado) || 0), 0);
      return total + utilizables * (Number(producto.precioFactura) || 0);
    }, 0);
  }

  // ================================
  // REGISTRAR RECEPCIÓN
  // ================================

  registrarRecepcion(): void {

    if (!this.pedido) {
      return;
    }

    const recepcionValida = this.productos.every(
      producto =>
        producto.recibido >= 0 &&
        producto.danado >= 0 &&
        producto.facturado >= 0 &&
        producto.precioFactura >= 0 &&
        producto.danado <= producto.recibido
    );

    if (!recepcionValida) {
      alert('Revisa las cantidades: no puede haber negativos y las dañadas no pueden superar las recibidas.');
      return;
    }

    const inconsistencias = this.totalInconsistencias;
    if (
      inconsistencias > 0 &&
      !confirm(
        `Hay ${inconsistencias} inconsistencia(s) entre el pedido, la factura y lo recibido. ` +
        '¿Registrar la recepción de todas formas?'
      )
    ) {
      return;
    }

    const unidadesUtilizables = this.productos.reduce(
      (total, producto) => total + Math.max(producto.recibido - producto.danado, 0),
      0
    );
    const destino = this.pedido.zona_entrega ? 'Bodega' : 'Local';

    this.guardando = true;
    this.error = '';

    // Listas en el mismo orden que los productos del pedido
    this.pedidoService.registrarRecepcion(this.pedido.codigo, {
      llegan: this.productos.map(producto => Number(producto.recibido) || 0),
      danados: this.productos.map(producto => Number(producto.danado) || 0),
      facturado: this.productos.map(producto => Number(producto.facturado) || 0),
      precio_factura: this.productos.map(producto => Number(producto.precioFactura) || 0),
      observaciones: this.observaciones.trim()
    }).subscribe({
      next: () => {
        this.guardando = false;

        let mensaje = 'Recepción registrada correctamente.\n\n';
        mensaje += `Unidades que ingresan a ${destino}: ${unidadesUtilizables}\n`;
        if (this.getTotalFaltantes() > 0) {
          mensaje += `Faltantes: ${this.getTotalFaltantes()}\n`;
        }
        if (this.getTotalSobrantes() > 0) {
          mensaje += `Sobrantes: ${this.getTotalSobrantes()}\n`;
        }
        if (this.getTotalDanados() > 0) {
          mensaje += `Dañadas: ${this.getTotalDanados()}\n`;
        }
        if (inconsistencias > 0) {
          mensaje += `Inconsistencias con la factura: ${inconsistencias}\n`;
        }

        alert(mensaje);
        this.router.navigate(['/pedidos-proveedor']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }

}
