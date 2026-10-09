import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMovimiento, TipoMovimiento } from '../../interfaces/movimiento.interface';
import { HistorialService } from '../../services/historial.service';
import { VentaService } from '../../services/venta.service';
import { TrasladoService } from '../../services/traslado.service';
import { mensajeDeError } from '../../utils/http-error';
import { categoriasDe, coincideCategoria } from '../../utils/tipos';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit {

  tipoSeleccionado = '';
  productoBuscado = '';
  fechaDesde = '';
  fechaHasta = '';

  // Categoría de figura ('' = todas, 'sin' = sin categoría)
  categoriaSeleccionada = '';

  // Cada venta, traslado o pedido llega desplegado en un movimiento por producto
  movimientos: IMovimiento[] = [];
  cargando = false;
  error = '';

  // Referencia (V0012, T0003) que se está anulando en este momento
  anulando = '';

  constructor(
    private historialService: HistorialService,
    private ventaService: VentaService,
    private trasladoService: TrasladoService
  ) {}

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.cargando = true;
    this.error = '';

    this.historialService.getMovimientos().subscribe({
      next: movimientos => {
        this.movimientos = movimientos;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get movimientosFiltrados(): IMovimiento[] {
    return this.movimientos.filter(movimiento => {

      // '2026-09-02T08:00:00' -> '2026-09-02' para comparar con los filtros
      const dia = (movimiento.fecha ?? '').slice(0, 10);

      const coincideTipo =
        !this.tipoSeleccionado ||
        movimiento.tipo === this.tipoSeleccionado;

      const coincideProducto =
        !this.productoBuscado ||
        movimiento.producto
          .toLowerCase()
          .includes(this.productoBuscado.trim().toLowerCase());

      const coincideDesde =
        !this.fechaDesde ||
        dia >= this.fechaDesde;

      const coincideHasta =
        !this.fechaHasta ||
        dia <= this.fechaHasta;

      const coincideCat =
        !this.categoriaSeleccionada ||
        (movimiento.tipo_producto === 'figura' &&
          coincideCategoria(movimiento.categoria, this.categoriaSeleccionada));

      return (
        coincideCat &&
        coincideTipo &&
        coincideProducto &&
        coincideDesde &&
        coincideHasta
      );
    });
  }

  get categorias(): string[] {
    return categoriasDe(this.movimientos);
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = '';
    this.tipoSeleccionado = '';
    this.productoBuscado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  // Solo ventas y traslados se pueden anular desde el historial
  sePuedeAnular(movimiento: IMovimiento): boolean {
    return movimiento.tipo === 'Venta / Salida' || movimiento.tipo === 'Traslado';
  }

  /*
    Anula la venta o el traslado completo al que pertenece la fila.
    Una venta o un traslado puede tener varios productos (varias filas con la
    misma referencia); al anularlo se devuelven TODAS sus unidades:
      - Venta:    las unidades vuelven al inventario del local.
      - Traslado: las unidades vuelven del destino al origen.
  */
  anular(movimiento: IMovimiento): void {
    if (!this.sePuedeAnular(movimiento) || this.anulando) {
      return;
    }

    const numero = Number(movimiento.codigo.replace(/\D/g, ''));
    const esVenta = movimiento.tipo === 'Venta / Salida';
    const filas = this.movimientos.filter(
      item => item.tipo === movimiento.tipo && item.codigo === movimiento.codigo
    );
    const detalle = filas.map(item => `• ${item.cantidad} × ${item.producto}`).join('\n');
    const devolucion = esVenta
      ? 'Las unidades vuelven al inventario del local.'
      : `Las unidades vuelven de ${movimiento.destino} a ${movimiento.origen}.`;

    const confirmado = confirm(
      `¿Anular ${esVenta ? 'la venta' : 'el traslado'} ${movimiento.codigo}?\n\n` +
      `${detalle}\n\n${devolucion}\nEsta acción no se puede deshacer.`
    );
    if (!confirmado) {
      return;
    }

    this.anulando = movimiento.codigo;
    const peticion = esVenta
      ? this.ventaService.anularVenta(numero)
      : this.trasladoService.anularTraslado(numero);

    peticion.subscribe({
      next: () => {
        this.anulando = '';
        alert(`${esVenta ? 'Venta' : 'Traslado'} ${movimiento.codigo} anulado. ${devolucion}`);
        this.cargarMovimientos();
      },
      error: err => {
        this.anulando = '';
        alert(mensajeDeError(err));
      }
    });
  }

  obtenerClaseTipo(tipo: TipoMovimiento): string {
    if (tipo === 'Venta / Salida') {
      return 'tipo-venta';
    }

    if (tipo === 'Traslado') {
      return 'tipo-traslado';
    }

    return 'tipo-pedido';
  }

  obtenerClaseEstado(estado: string): string {
    if (estado === 'Completado' || estado === 'Recibido') {
      return 'estado-completado';
    }

    return 'estado-pendiente';
  }
}
