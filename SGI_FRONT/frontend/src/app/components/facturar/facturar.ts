import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturaService } from '../../services/factura.service';
import { AuthService } from '../../services/auth.service';
import { IVenta } from '../../interfaces/venta.interface';
import {
  IClienteFactura, IFactura, IOpcionesFacturacion, TipoFactura
} from '../../interfaces/factura.interface';
import { mensajeDeError } from '../../utils/http-error';
import { imprimirFactura, pesos } from '../../utils/factura-impresion';

/*
  Ventana para facturar una venta:
    - Tirilla POS (documento equivalente): el cliente es opcional
      (si no se identifica queda como consumidor final).
    - Factura electrónica: exige nombre, documento y correo del cliente.
  Al emitir, abre la impresión (tirilla 80/58 mm o factura carta).

  Uso:
    <app-facturar *ngIf="ventaAFacturar" [venta]="ventaAFacturar"
                  (emitida)="..." (cerrar)="ventaAFacturar = null"></app-facturar>
*/
@Component({
  selector: 'app-facturar',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './facturar.html',
  styleUrl: './facturar.css'
})
export class Facturar implements OnInit {

  @Input({ required: true }) venta!: IVenta;
  // Texto opcional arriba (ej. "Venta registrada")
  @Input() titulo = 'Facturar venta';
  @Input() tipoInicial: TipoFactura = 'pos';

  @Output() emitida = new EventEmitter<IFactura>();
  @Output() cerrar = new EventEmitter<void>();

  tipo: TipoFactura = 'pos';
  identificarCliente = false;     // solo tirilla: si no, consumidor final
  cliente: IClienteFactura = {
    tipo_documento: 'CC', documento: '', nombre: '', correo: '', direccion: '', telefono: ''
  };
  formaPago = 'Contado';
  diasCredito = 30;
  medioPago = 'Efectivo';
  recibido: number | null = null;
  observaciones = '';

  opciones: IOpcionesFacturacion | null = null;
  resolucionLista = true;         // false = aún no hay resolución DIAN registrada
  emitiendo = false;
  error = '';
  pesos = pesos;

  constructor(
    private facturaService: FacturaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.tipo = this.tipoInicial;
    this.facturaService.getDatos().subscribe({
      next: ({ datos, opciones }) => {
        this.opciones = opciones;
        this.datos = datos;
        this.revisarResolucion();
      },
      error: err => (this.error = mensajeDeError(err))
    });
  }

  private datos: Record<string, string> = {};

  // ¿Está registrada la resolución DIAN del tipo elegido?
  revisarResolucion(): void {
    const p = this.tipo === 'pos' ? 'pos' : 'fe';
    this.resolucionLista = !!(this.datos[`${p}_resolucion`] && this.datos[`${p}_hasta`] && this.datos[`${p}_vigencia_hasta`]);
  }

  cambiarTipo(tipo: TipoFactura): void {
    this.tipo = tipo;
    this.error = '';
    this.revisarResolucion();
  }

  get pideCliente(): boolean {
    return this.tipo === 'electronica' || this.identificarCliente || this.formaPago === 'Crédito';
  }

  get cambio(): number {
    return this.recibido ? Math.max(Number(this.recibido) - this.venta.total, 0) : 0;
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (!this.emitiendo) {
      this.cerrar.emit();
    }
  }

  emitir(): void {
    this.error = '';
    if (this.tipo === 'electronica') {
      const faltan = [
        !this.cliente.documento.trim() && 'número de documento',
        !this.cliente.nombre.trim() && 'nombre o razón social',
        !this.cliente.correo.trim() && 'correo'
      ].filter(Boolean);
      if (faltan.length) {
        this.error = 'Para la factura electrónica falta: ' + faltan.join(', ') + '.';
        return;
      }
    }
    if (this.medioPago === 'Efectivo' && this.recibido && Number(this.recibido) < this.venta.total) {
      this.error = 'El valor recibido es menor que el total.';
      return;
    }

    this.emitiendo = true;
    this.facturaService.crearFactura({
      venta: this.venta.codigo,
      tipo: this.tipo,
      cliente: this.pideCliente ? this.cliente : undefined,
      forma_pago: this.formaPago,
      dias_credito: this.formaPago === 'Crédito' ? Number(this.diasCredito) || 30 : undefined,
      medio_pago: this.medioPago,
      recibido: this.medioPago === 'Efectivo' && this.recibido ? Number(this.recibido) : null,
      observaciones: this.observaciones.trim(),
      usuario: this.authService.usuarioActual?.nombre ?? ''
    }).subscribe({
      next: factura => {
        this.emitiendo = false;
        if (!imprimirFactura(factura)) {
          this.error = 'Factura emitida, pero el navegador bloqueó la ventana de impresión. ' +
            'Permite las ventanas emergentes e imprímela desde Facturas.';
        }
        this.emitida.emit(factura);
      },
      error: err => {
        this.emitiendo = false;
        this.error = mensajeDeError(err);
      }
    });
  }
}
