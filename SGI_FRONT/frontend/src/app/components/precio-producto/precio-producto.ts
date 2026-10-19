import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import { calcularPrecios, sugeridoPintarLocal, sugeridoTerminada } from '../../utils/precios';

// Campos de precio que comparte el formulario de nuevo y de editar producto
export interface IDatosPrecio {
  costo: number;             // precio de fábrica
  envio_categoria: string;   // Mini, Pequeño... o 'Personalizado'
  envio: number;
  precio_venta: number;      // crudo + envío
  precio_mayorista: number;  // por mayor + envío
  precio_pintar_local: number; // solo figuras: sugerido crudo × 2
  precio_terminada: number;    // solo figuras: sugerido pintar en el local × 2
  kit_categoria: string;       // solo figuras: tamaño del kit, 'Personalizado' o '' (según envío)
  precio_kit: number | null;   // valor del kit (null = el de la tabla)
}

export const ENVIO_PERSONALIZADO = 'Personalizado';

/*
  Calcula los precios sugeridos y deja editarlos todos:
    crudo y por mayor  <- precio de fábrica y envío
    pintar en el local <- crudo × 2
    figura terminada   <- pintar en el local × 2
  Si el usuario cambia un precio a mano, ya no se recalcula hasta que pulse
  "Usar calculado".

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
  // Valor del kit para llevar por tamaño (Pequeño $6.000, Mediano $8.000...)
  @Input() tarifasKit: ITarifaEnvio[] = [];
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
  pintarEditado = false;
  terminadaEditada = false;

  ngOnInit(): void {
    // En edición: si los precios guardados no coinciden con la fórmula,
    // se respetan como valores editados a mano.
    if (!this.esFigura) {
      return;
    }
    const calculado = this.calculado;
    this.crudoEditado = !!this.datos.precio_venta && this.datos.precio_venta !== calculado.crudo;
    this.mayorEditado = !!this.datos.precio_mayorista && this.datos.precio_mayorista !== calculado.mayor;
    this.pintarEditado =
      !!this.datos.precio_pintar_local && this.datos.precio_pintar_local !== this.sugeridoPintar;
    this.terminadaEditada =
      !!this.datos.precio_terminada && this.datos.precio_terminada !== this.sugeridoTerminada;
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
      this.datos.precio_pintar_local = 0;
      this.datos.precio_terminada = 0;
      this.datos.kit_categoria = '';
      this.datos.precio_kit = null;
    }
    // Si pasa de material a figura, vuelve a sugerir todos los precios
    if (cambios['esFigura'] && !cambios['esFigura'].firstChange && this.esFigura && this.datos) {
      this.pintarEditado = false;
      this.terminadaEditada = false;
      this.recalcular();
    }
  }

  get calculado(): { crudo: number; mayor: number } {
    return calcularPrecios(this.datos.costo, this.datos.envio, this.valores);
  }

  // Sugeridos a partir del precio crudo y de pintar en el local actuales
  get sugeridoPintar(): number {
    return sugeridoPintarLocal(this.datos.precio_venta);
  }

  get sugeridoTerminada(): number {
    return sugeridoTerminada(this.datos.precio_pintar_local);
  }

  // ================================
  // KIT PARA LLEVAR (5 pinturas + 1 pincel)
  // ================================

  private tarifaKit(nombre: string): ITarifaEnvio | undefined {
    const buscado = (nombre || '').trim().toLowerCase();
    return buscado ? this.tarifasKit.find(tarifa => tarifa.nombre.toLowerCase() === buscado) : undefined;
  }

  // Opción que muestra el selector del kit
  get kitSeleccionado(): string {
    const categoria = this.datos.kit_categoria || '';
    if (categoria === this.personalizado) {
      return this.personalizado;
    }
    return this.tarifaKit(categoria) ? this.tarifaKit(categoria)!.nombre : '';
  }

  // Sin tamaño elegido: se usa el del envío si existe en la tabla de kits
  get kitPorEnvio(): ITarifaEnvio | undefined {
    return this.tarifaKit(this.datos.envio_categoria);
  }

  // Valor del kit que se cobra con esta figura
  get valorKit(): number {
    if (this.datos.precio_kit !== null && this.datos.precio_kit !== undefined && `${this.datos.precio_kit}` !== '') {
      return Number(this.datos.precio_kit) || 0;
    }
    return (this.tarifaKit(this.datos.kit_categoria) ?? this.kitPorEnvio)?.precio ?? this.valores.valor_kit_local;
  }

  get kitEditable(): boolean {
    return this.kitSeleccionado === this.personalizado;
  }

  elegirKit(nombre: string): void {
    if (nombre === this.personalizado) {
      const actual = this.valorKit;
      this.datos.kit_categoria = this.personalizado;
      this.datos.precio_kit = actual;
    } else if (!nombre) {
      this.datos.kit_categoria = '';
      this.datos.precio_kit = null;
    } else {
      this.datos.kit_categoria = nombre;
      this.datos.precio_kit = this.tarifaKit(nombre)?.precio ?? null;
    }
  }

  editarKit(valor: number): void {
    this.datos.kit_categoria = this.personalizado;
    this.datos.precio_kit = Number(valor) || 0;
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
    this.recalcularPintura();
  }

  // Pintar en el local sigue al crudo y la terminada sigue a pintar en el local
  private recalcularPintura(): void {
    if (!this.esFigura) {
      return;
    }
    if (!this.pintarEditado) {
      this.datos.precio_pintar_local = this.sugeridoPintar;
    }
    if (!this.terminadaEditada) {
      this.datos.precio_terminada = this.sugeridoTerminada;
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
    this.recalcularPintura();
  }

  editarPintar(valor: number): void {
    this.datos.precio_pintar_local = Number(valor) || 0;
    this.pintarEditado = this.datos.precio_pintar_local !== this.sugeridoPintar;
    this.recalcularPintura();
  }

  editarTerminada(valor: number): void {
    this.datos.precio_terminada = Number(valor) || 0;
    this.terminadaEditada = this.datos.precio_terminada !== this.sugeridoTerminada;
  }

  usarSugeridoPintar(): void {
    this.pintarEditado = false;
    this.recalcularPintura();
  }

  usarSugeridoTerminada(): void {
    this.terminadaEditada = false;
    this.recalcularPintura();
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
