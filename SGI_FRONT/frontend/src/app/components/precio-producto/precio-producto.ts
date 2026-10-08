import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import { calcularPrecios } from '../../utils/precios';

// Campos de precio que comparte el formulario de nuevo y de editar producto
export interface IDatosPrecio {
  costo: number;             // precio de fábrica
  envio_categoria: string;   // Mini, Pequeño... o 'Personalizado'
  envio: number;
  precio_venta: number;      // crudo + envío
  precio_mayorista: number;  // por mayor + envío
}

export const ENVIO_PERSONALIZADO = 'Personalizado';

/*
  Calcula solo el precio crudo y por mayor a partir del precio de fábrica y del
  envío, pero deja editar ambos campos. Si el usuario los cambia a mano, ya no
  se recalculan hasta que pulse "Usar calculado".

  Uso: <app-precio-producto [datos]="producto" [tarifas]="tarifas"
                            [valores]="valores" [limite]="3150"></app-precio-producto>
*/
@Component({
  selector: 'app-precio-producto',
  imports: [NgFor, NgIf, FormsModule, DecimalPipe],
  templateUrl: './precio-producto.html',
  styleUrl: './precio-producto.css'
})
export class PrecioProducto implements OnInit, OnChanges {

  @Input({ required: true }) datos!: IDatosPrecio;
  @Input() tarifas: ITarifaEnvio[] = [];
  @Input() valores: IValoresConfiguracion = VALORES_POR_DEFECTO;
  // Precio máximo por figura pactado con el proveedor (null = sin límite)
  @Input() limite: number | null = null;
  // Para que los id de los inputs no se repitan cuando hay varios productos
  @Input() idPrefijo = 'precio';

  // Figuras: precio con fórmula y envío. Materiales (pinturas, pinceles,
  // otros): precio de compra, de venta y por mayor escritos a mano.
  @Input() esFigura = true;

  readonly personalizado = ENVIO_PERSONALIZADO;

  crudoEditado = false;
  mayorEditado = false;

  ngOnInit(): void {
    // En edición: si los precios guardados no coinciden con la fórmula,
    // se respetan como valores editados a mano.
    if (!this.esFigura) {
      return;
    }
    const calculado = this.calculado;
    this.crudoEditado = !!this.datos.precio_venta && this.datos.precio_venta !== calculado.crudo;
    this.mayorEditado = !!this.datos.precio_mayorista && this.datos.precio_mayorista !== calculado.mayor;
    this.recalcular();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Si cambian los multiplicadores en configuración, actualiza lo calculado
    if (cambios['valores'] && !cambios['valores'].firstChange) {
      this.recalcular();
    }
    // Los materiales no llevan envío por tamaño
    if (cambios['esFigura'] && !this.esFigura && this.datos) {
      this.datos.envio = 0;
      this.datos.envio_categoria = '';
    }
  }

  get calculado(): { crudo: number; mayor: number } {
    return calcularPrecios(this.datos.costo, this.datos.envio, this.valores);
  }

  get superaLimite(): boolean {
    return this.esFigura && !!this.limite && (Number(this.datos.costo) || 0) > this.limite;
  }

  // Valor que muestra el selector de envío
  get categoriaSeleccionada(): string {
    const categoria = this.datos.envio_categoria || '';
    if (!categoria) {
      return '';
    }
    return this.tarifas.some(tarifa => tarifa.nombre === categoria)
      ? categoria
      : this.personalizado;
  }

  get envioEditable(): boolean {
    return this.categoriaSeleccionada === this.personalizado;
  }

  recalcular(): void {
    if (!this.esFigura) {
      return;   // en materiales los precios se escriben a mano
    }
    const { crudo, mayor } = this.calculado;
    if (!this.crudoEditado) {
      this.datos.precio_venta = crudo;
    }
    if (!this.mayorEditado) {
      this.datos.precio_mayorista = mayor;
    }
  }

  elegirEnvio(categoria: string): void {
    if (categoria === this.personalizado) {
      this.datos.envio_categoria = this.personalizado;
    } else if (!categoria) {
      this.datos.envio_categoria = '';
      this.datos.envio = 0;
    } else {
      const tarifa = this.tarifas.find(item => item.nombre === categoria);
      this.datos.envio_categoria = categoria;
      this.datos.envio = tarifa?.precio ?? 0;
    }
    this.recalcular();
  }

  editarCrudo(valor: number): void {
    this.datos.precio_venta = Number(valor) || 0;
    this.crudoEditado = this.esFigura && this.datos.precio_venta !== this.calculado.crudo;
  }

  editarMayor(valor: number): void {
    this.datos.precio_mayorista = Number(valor) || 0;
    this.mayorEditado = this.esFigura && this.datos.precio_mayorista !== this.calculado.mayor;
  }

  usarCalculadoCrudo(): void {
    this.crudoEditado = false;
    this.recalcular();
  }

  usarCalculadoMayor(): void {
    this.mayorEditado = false;
    this.recalcular();
  }
}
