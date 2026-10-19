import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService } from '../../services/caja.service';
import { AuthService } from '../../services/auth.service';
import {
  DENOMINACIONES, ICaja, IOpcionesCaja, IResumenCaja
} from '../../interfaces/caja.interface';
import { mensajeDeError } from '../../utils/http-error';
import { imprimirCierre, textoDiferencia } from '../../utils/caja-impresion';

type Pestana = 'hoy' | 'historial';
type ModoConteo = 'billetes' | 'total';

/*
  Cuadre de caja del día:
    1. Abrir caja con la base de efectivo.
    2. Las ventas guardan cómo se pagaron (efectivo, Nequi, transferencia, tarjeta o mixto).
    3. Entradas y salidas de efectivo que no son ventas (con motivo).
    4. Cerrar: contar el efectivo por billetes y monedas o escribir el total,
       y ver si cuadra, sobra o falta. Transferencias, Nequi y tarjeta se listan
       para revisarlas contra el banco o el datáfono.
*/
@Component({
  selector: 'app-caja',
  imports: [NgFor, NgIf, FormsModule, DatePipe],
  templateUrl: './caja.html',
  styleUrl: './caja.css'
})
export class Caja implements OnInit {

  pestana: Pestana = 'hoy';
  hoy = new Date();

  caja: ICaja | null = null;          // caja de hoy
  opciones: IOpcionesCaja | null = null;
  cargando = false;
  error = '';
  aviso = '';

  // Abrir caja
  base: number | null = null;
  abriendo = false;

  // Movimientos de efectivo
  movTipo: 'entrada' | 'salida' = 'salida';
  movCategoria = '';
  movValor: number | null = null;
  movMotivo = '';
  guardandoMov = false;

  // Cierre
  modoConteo: ModoConteo = 'billetes';
  readonly denominaciones = DENOMINACIONES;
  conteo: Record<number, number | null> = {};
  totalEscrito: number | null = null;
  observaciones = '';
  cerrando = false;

  // Historial
  cajas: ICaja[] = [];
  seleccionada: ICaja | null = null;   // caja del historial que se está viendo

  textoDiferencia = textoDiferencia;

  constructor(
    private cajaService: CajaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarHoy();
  }

  private get usuario(): string {
    return this.authService.usuarioActual?.nombre ?? '';
  }

  cargarHoy(): void {
    this.cargando = true;
    this.error = '';
    this.cajaService.getHoy().subscribe({
      next: ({ caja, opciones }) => {
        this.caja = caja;
        this.opciones = opciones;
        this.movCategoria = opciones.categorias[this.movTipo][0] ?? '';
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  cargarHistorial(): void {
    this.pestana = 'historial';
    this.seleccionada = null;
    this.cajaService.getCajas().subscribe({
      next: cajas => (this.cajas = cajas),
      error: err => (this.error = mensajeDeError(err))
    });
  }

  verCaja(codigo: number): void {
    this.cajaService.getCaja(codigo).subscribe({
      next: caja => (this.seleccionada = caja),
      error: err => (this.aviso = mensajeDeError(err))
    });
  }

  get resumen(): IResumenCaja | null {
    return this.caja?.resumen_actual ?? null;
  }

  efectivoVentas(r: IResumenCaja | null | undefined): number {
    return r?.por_medio.find(m => m.medio === 'Efectivo')?.valor ?? 0;
  }


  // ================================
  // ABRIR
  // ================================

  abrir(): void {
    this.abriendo = true;
    this.error = '';
    this.cajaService.abrir(Number(this.base) || 0, this.usuario).subscribe({
      next: caja => {
        this.abriendo = false;
        this.caja = caja;
        this.aviso = 'Caja abierta. ¡Buenas ventas!';
      },
      error: err => {
        this.abriendo = false;
        this.error = mensajeDeError(err);
      }
    });
  }


  // ================================
  // MOVIMIENTOS DE EFECTIVO
  // ================================

  cambiarTipoMovimiento(tipo: 'entrada' | 'salida'): void {
    this.movTipo = tipo;
    this.movCategoria = this.opciones?.categorias[tipo][0] ?? '';
  }

  get categoriasMovimiento(): string[] {
    return this.opciones?.categorias[this.movTipo] ?? [];
  }

  agregarMovimiento(): void {
    if (!this.caja) {
      return;
    }
    if (!(Number(this.movValor) > 0) || !this.movMotivo.trim()) {
      this.aviso = 'Escribe el valor y el motivo del movimiento.';
      return;
    }
    this.guardandoMov = true;
    this.cajaService.agregarMovimiento(this.caja.codigo, {
      tipo: this.movTipo,
      valor: Number(this.movValor),
      motivo: this.movMotivo.trim(),
      categoria: this.movCategoria,
      usuario: this.usuario
    }).subscribe({
      next: caja => {
        this.guardandoMov = false;
        this.caja = caja;
        this.movValor = null;
        this.movMotivo = '';
        this.aviso = '';
      },
      error: err => {
        this.guardandoMov = false;
        this.aviso = mensajeDeError(err);
      }
    });
  }

  eliminarMovimiento(codigo: number): void {
    if (!confirm('¿Eliminar este movimiento de caja?')) {
      return;
    }
    this.cajaService.eliminarMovimiento(codigo).subscribe({
      next: () => this.cargarHoy(),
      error: err => (this.aviso = mensajeDeError(err))
    });
  }


  // ================================
  // CIERRE
  // ================================

  get totalBilletes(): number {
    return this.denominaciones.reduce((total, d) => total + d * (Number(this.conteo[d]) || 0), 0);
  }

  get efectivoContado(): number | null {
    if (this.modoConteo === 'billetes') {
      return this.totalBilletes;
    }
    return this.totalEscrito === null || `${this.totalEscrito}` === '' ? null : Number(this.totalEscrito) || 0;
  }

  get diferenciaActual(): number | null {
    const contado = this.efectivoContado;
    return contado === null || !this.resumen ? null : contado - this.resumen.efectivo_esperado;
  }

  cerrar(): void {
    if (!this.caja || !this.resumen) {
      return;
    }
    const contado = this.efectivoContado;
    if (contado === null) {
      this.aviso = 'Escribe el efectivo contado.';
      return;
    }
    const diferencia = this.diferenciaActual ?? 0;
    if (diferencia !== 0 && !this.observaciones.trim()) {
      this.aviso = `${textoDiferencia(diferencia)}: escribe una observación explicando la diferencia.`;
      return;
    }
    if (!confirm(`¿Cerrar la caja de hoy?\n\nEfectivo contado: $${contado.toLocaleString('es-CO')}\n${textoDiferencia(diferencia)}`)) {
      return;
    }

    const conteo: Record<string, number> = {};
    if (this.modoConteo === 'billetes') {
      this.denominaciones.forEach(d => {
        const cantidad = Number(this.conteo[d]) || 0;
        if (cantidad) {
          conteo[String(d)] = cantidad;
        }
      });
    }

    this.cerrando = true;
    this.cajaService.cerrar(this.caja.codigo, {
      ...(this.modoConteo === 'billetes' && Object.keys(conteo).length
        ? { conteo }
        : { efectivo_contado: contado }),
      observaciones: this.observaciones.trim(),
      usuario: this.usuario
    }).subscribe({
      next: caja => {
        this.cerrando = false;
        this.caja = caja;
        this.aviso = 'Caja cerrada.';
        if (!imprimirCierre(caja)) {
          this.aviso = 'Caja cerrada. Permite las ventanas emergentes para imprimir el cierre.';
        }
      },
      error: err => {
        this.cerrando = false;
        this.aviso = mensajeDeError(err);
      }
    });
  }

  reabrir(caja: ICaja): void {
    const motivo = prompt('¿Por qué se reabre la caja? (queda registrado)', '');
    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.aviso = 'Escribe el motivo para reabrir la caja.';
      return;
    }
    this.cajaService.reabrir(caja.codigo, motivo.trim()).subscribe({
      next: abierta => {
        this.aviso = 'Caja reabierta.';
        if (this.caja && abierta.codigo === this.caja.codigo) {
          this.caja = abierta;
        }
        if (this.pestana === 'historial') {
          this.cargarHistorial();
        }
      },
      error: err => (this.aviso = mensajeDeError(err))
    });
  }

  imprimir(caja: ICaja): void {
    if (!imprimirCierre(caja)) {
      this.aviso = 'Permite las ventanas emergentes para imprimir el cierre.';
    }
  }

  subtotalBillete(denominacion: number): number {
    return denominacion * (Number(this.conteo[denominacion]) || 0);
  }

  pesos(valor: number): string {
    return '$' + Math.round(Number(valor) || 0).toLocaleString('es-CO');
  }

  pesosOGuion(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : this.pesos(valor);
  }

  totalVentasCaja(caja: ICaja): number | null {
    return caja.resumen?.total_ventas ?? null;
  }
}
