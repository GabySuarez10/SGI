import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TipoMovimiento =
  | 'Venta / Salida'
  | 'Traslado'
  | 'Pedido a proveedor';

interface Movimiento {
  tipo: TipoMovimiento;
  codigo: string;
  producto: string;
  cantidad: number;
  origen: string;
  destino: string;
  fecha: string;
  estado: string;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial {

  tipoSeleccionado = '';
  productoBuscado = '';
  fechaDesde = '';
  fechaHasta = '';

  movimientos: Movimiento[] = [
    {
      tipo: 'Venta / Salida',
      codigo: 'V0012',
      producto: 'Muñeco de nieve',
      cantidad: 5,
      origen: 'Local',
      destino: 'Cliente',
      fecha: '2026-10-03',
      estado: 'Completado'
    },
    {
      tipo: 'Traslado',
      codigo: 'T0008',
      producto: 'Princesa Sofía',
      cantidad: 10,
      origen: 'Bodega',
      destino: 'Local',
      fecha: '2026-10-02',
      estado: 'Completado'
    },
    {
      tipo: 'Pedido a proveedor',
      codigo: 'PP0006',
      producto: 'Calabaza',
      cantidad: 20,
      origen: 'Freddy Bogotá',
      destino: 'Bodega',
      fecha: '2026-10-01',
      estado: 'Recibido'
    },
    {
      tipo: 'Venta / Salida',
      codigo: 'V0011',
      producto: 'Ángel navideño',
      cantidad: 3,
      origen: 'Local',
      destino: 'Cliente',
      fecha: '2026-09-30',
      estado: 'Completado'
    },
    {
      tipo: 'Traslado',
      codigo: 'T0007',
      producto: 'Reno',
      cantidad: 6,
      origen: 'Bodega',
      destino: 'Local',
      fecha: '2026-09-29',
      estado: 'Completado'
    },
    {
      tipo: 'Pedido a proveedor',
      codigo: 'PP0005',
      producto: 'Casita navideña',
      cantidad: 15,
      origen: 'Diego Cali',
      destino: 'Bodega',
      fecha: '2026-09-28',
      estado: 'Pendiente'
    }
  ];

  get movimientosFiltrados(): Movimiento[] {
    return this.movimientos.filter(movimiento => {

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
        movimiento.fecha >= this.fechaDesde;

      const coincideHasta =
        !this.fechaHasta ||
        movimiento.fecha <= this.fechaHasta;

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