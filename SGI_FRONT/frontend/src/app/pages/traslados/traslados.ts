import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IInventarioBodega } from '../../interfaces/inventario.interface';
import { InventarioService } from '../../services/inventario.service';
import { TrasladoService } from '../../services/traslado.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, imagenNoCarga } from '../../utils/imagen';

// Producto de bodega + la cantidad que el usuario elige trasladar
interface ProductoTraslado extends IInventarioBodega {
  cantidadTraslado: number;
}

@Component({
  selector: 'app-traslados',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './traslados.html',
  styleUrl: './traslados.css',
})
export class Traslados implements OnInit {

  busqueda = '';

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
    this.cargando = true;

    this.inventarioService.getBodega().subscribe({
      next: productos => {
        this.productos = productos.map(producto => ({
          ...producto,
          cantidadTraslado: 0
        }));
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
      !texto ||
      producto.nombre.toLowerCase().includes(texto) ||
      String(producto.codigo).includes(texto)
    );
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
      cantidad: seleccionados.map(producto => producto.cantidadTraslado)
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
          `Unidades trasladadas al local: ${this.totalUnidades}\n\n` +
          productosTexto
        );

        this.router.navigate(['/local']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });
  }

}
