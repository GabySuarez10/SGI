import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ITarifaEnvio } from '../../interfaces/configuracion.interface';
import { ConfiguracionService } from '../../services/configuracion.service';
import { mensajeDeError } from '../../utils/http-error';

/*
  Tablita informativa de precios de envío por tamaño (Mini, Pequeño, ...).
  Se puede editar ahí mismo y los cambios se guardan en la base de datos.

  Uso:  <app-tabla-envios [(tarifas)]="tarifas"></app-tabla-envios>
*/
@Component({
  selector: 'app-tabla-envios',
  imports: [NgFor, NgIf, FormsModule, DecimalPipe],
  templateUrl: './tabla-envios.html',
  styleUrl: './tabla-envios.css'
})
export class TablaEnvios {

  @Input() tarifas: ITarifaEnvio[] = [];
  @Output() tarifasChange = new EventEmitter<ITarifaEnvio[]>();

  // Muestra el texto de ayuda sobre cómo se suma el envío
  @Input() mostrarAyuda = true;

  editando = false;
  borrador: ITarifaEnvio[] = [];
  guardando = false;
  error = '';

  constructor(private configuracionService: ConfiguracionService) {}

  editar(): void {
    this.borrador = this.tarifas.map(tarifa => ({ ...tarifa }));
    this.error = '';
    this.editando = true;
  }

  agregarFila(): void {
    this.borrador.push({ nombre: '', precio: 0 });
  }

  quitarFila(index: number): void {
    this.borrador.splice(index, 1);
  }

  cancelar(): void {
    this.editando = false;
    this.error = '';
  }

  guardar(): void {
    if (this.borrador.some(tarifa => !tarifa.nombre.trim())) {
      this.error = 'Todas las filas deben tener un nombre de tamaño.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.configuracionService
      .guardarTarifasEnvio(
        this.borrador.map(tarifa => ({
          ...tarifa,
          nombre: tarifa.nombre.trim(),
          precio: Number(tarifa.precio) || 0
        }))
      )
      .subscribe({
        next: tarifas => {
          this.guardando = false;
          this.editando = false;
          this.tarifas = tarifas;
          this.tarifasChange.emit(tarifas);
        },
        error: err => {
          this.guardando = false;
          this.error = mensajeDeError(err);
        }
      });
  }
}
