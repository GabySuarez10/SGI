import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMovimiento, TipoMovimiento } from '../../interfaces/movimiento.interface';
import { HistorialService } from '../../services/historial.service';
import { mensajeDeError } from '../../utils/http-error';

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

  // Cada venta, traslado o pedido llega desplegado en un movimiento por producto
  movimientos: IMovimiento[] = [];
  cargando = false;
  error = '';

  constructor(private historialService: HistorialService) {}

  ngOnInit(): void {
    this.cargando = true;

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

      return (
        coincideTipo &&
        coincideProducto &&
        coincideDesde &&
        coincideHasta
      );
    });
  }

  limpiarFiltros(): void {
    this.tipoSeleccionado = '';
    this.productoBuscado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
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
