import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IPedidoProveedor } from '../../interfaces/pedido-proveedor.interface';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { ProductoService } from '../../services/producto.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

// Una fila de la tabla: se arma juntando la posición i de cada lista del pedido
interface ProductoPedido {
  nombre: string;
  referencia: string;
  imagen: string;
  solicitado: number;
  recibido: number;
  danado: number;
  precioEsperado: number;
}

@Component({
  selector: 'app-detalle-pedido',
  imports: [NgFor, NgIf, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.css',
})
export class DetallePedido implements OnInit {

  pedido: IPedidoProveedor | null = null;
  productos: ProductoPedido[] = [];

  cargando = false;
  guardando = false;
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
        this.pedido = pedido;

        // Imagen y referencia se buscan en el catálogo por el nombre del producto
        const porNombre = new Map(
          catalogo.map(producto => [producto.nombre.toLowerCase(), producto])
        );

        this.productos = pedido.productos.map((nombre, i) => {
          const producto = porNombre.get(nombre.toLowerCase());
          const solicitado = pedido.cantidad[i] ?? 0;
          return {
            nombre,
            referencia: producto?.referencia ?? '',
            imagen: producto?.imagen ?? '',
            solicitado,
            // Si está pendiente se propone que llegó todo lo solicitado
            recibido: pedido.estado ? (pedido.llegan[i] ?? 0) : solicitado,
            danado: pedido.estado ? (pedido.danados[i] ?? 0) : 0,
            precioEsperado: pedido.precio_esperado[i] ?? 0
          };
        });

        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  // Un pedido ya recibido solo se consulta
  get soloLectura(): boolean {
    return !!this.pedido?.estado;
  }

  get numeroPedido(): string {
    return String(this.pedido?.codigo ?? '').padStart(3, '0');
  }

  volver(): void {
    this.router.navigate(['/pedidos-proveedor']);
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
    return this.productos.reduce(
      (total, producto) => total + producto.solicitado,
      0
    );
  }

  getTotalEsperado(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getTotalProducto(producto),
      0
    );
  }

  getTotalRecibido(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.recibido,
      0
    );
  }

  getTotalFaltantes(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getFaltantes(producto),
      0
    );
  }

  getTotalSobrantes(): number {
    return this.productos.reduce(
      (total, producto) => total + this.getSobrantes(producto),
      0
    );
  }

  getTotalDanados(): number {
    return this.productos.reduce(
      (total, producto) => total + producto.danado,
      0
    );
  }

  getValorFaltante(): number {
    return this.productos.reduce(
      (total, producto) =>
        total + (this.getFaltantes(producto) * producto.precioEsperado),
      0
    );
  }

  getValorDanado(): number {
    return this.productos.reduce(
      (total, producto) =>
        total + (producto.danado * producto.precioEsperado),
      0
    );
  }

  getCostoUtilizable(): number {
    return this.productos.reduce(
      (total, producto) => {
        const unidadesUtilizables = Math.max(
          producto.recibido - producto.danado,
          0
        );

        return total + (unidadesUtilizables * producto.precioEsperado);
      },
      0
    );
  }

  registrarRecepcion(): void {

    if (!this.pedido) {
      return;
    }

    const recepcionValida = this.productos.every(
      producto =>
        producto.recibido >= 0 &&
        producto.danado >= 0 &&
        producto.danado <= producto.recibido
    );

    if (!recepcionValida) {
      alert(
        'La cantidad dañada no puede ser mayor que la cantidad recibida.'
      );
      return;
    }

    const unidadesUtilizables = this.productos.reduce(
      (total, producto) => total + Math.max(producto.recibido - producto.danado, 0),
      0
    );
    const destino = this.pedido.zona_entrega ? 'Bodega' : 'Local';
    const faltantes = this.getTotalFaltantes();
    const sobrantes = this.getTotalSobrantes();
    const danados = this.getTotalDanados();

    this.guardando = true;
    this.error = '';

    // Listas en el mismo orden que los productos del pedido
    this.pedidoService.registrarRecepcion(this.pedido.codigo, {
      llegan: this.productos.map(producto => Number(producto.recibido) || 0),
      danados: this.productos.map(producto => Number(producto.danado) || 0)
    }).subscribe({
      next: () => {
        this.guardando = false;

        let mensaje = 'Recepción registrada correctamente.\n\n';
        mensaje += `Unidades que ingresan a ${destino}: ${unidadesUtilizables}\n`;

        if (faltantes > 0) {
          mensaje += `Faltantes: ${faltantes}\n`;
        }

        if (sobrantes > 0) {
          mensaje += `Sobrantes: ${sobrantes}\n`;
        }

        if (danados > 0) {
          mensaje += `Dañadas: ${danados}\n`;
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
