import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IResumenDashboard } from '../../interfaces/dashboard.interface';
import { TipoMovimiento } from '../../interfaces/movimiento.interface';
import { HistorialService } from '../../services/historial.service';
import { mensajeDeError } from '../../utils/http-error';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, NgFor, NgIf, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  resumen: IResumenDashboard | null = null;
  error = '';

  constructor(private historialService: HistorialService) {}

  ngOnInit(): void {
    this.historialService.getResumenDashboard().subscribe({
      next: resumen => {
        this.resumen = resumen;
      },
      error: err => {
        this.error = mensajeDeError(err);
      }
    });
  }

  numeroPedido(codigo: number): string {
    return String(codigo).padStart(3, '0');
  }

  iconoMovimiento(tipo: TipoMovimiento): string {
    if (tipo === 'Traslado') {
      return '⇄';
    }
    if (tipo === 'Venta / Salida') {
      return '$';
    }
    return '▣';
  }

}
