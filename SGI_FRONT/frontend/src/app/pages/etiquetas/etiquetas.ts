import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IProducto } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { forkJoin } from 'rxjs';
import { EtiquetaProducto } from '../../components/etiqueta-producto/etiqueta-producto';
import { Escaner } from '../../components/escaner/escaner';
import { Icono } from '../../components/icono/icono';
import { mensajeDeError } from '../../utils/http-error';
import { buscarPorCodigo, codigoDeProducto } from '../../utils/codigos';
import {
  ContenidoEtiqueta, DatosEtiqueta, OpcionesEtiqueta, PRECIOS_ETIQUETA, PRECIOS_POR_DEFECTO,
  TipoPrecio, etiquetaSvg, preciosDeProducto
} from '../../utils/etiqueta';
import { copiarSvgComoImagen, copiarTexto, descargarSvgComoPng, nombreArchivo } from '../../utils/descargas';
import {
  VistaProductos, categoriasDe, coincideCategoria, coincideVista, nombreTipo
} from '../../utils/tipos';

// Cómo se imprime: hoja (impresora normal) o rollo (impresora de etiquetas)
export type FormatoImpresion =
  | { modo: 'hoja'; ancho: string }                    // ancho de cada etiqueta, ej. '62mm'
  | { modo: 'rollo'; ancho: number; alto: number };    // medida de la etiqueta del rollo en mm

/*
  Página HTML mínima con las etiquetas repetidas según sus copias.
  - Hoja: varias etiquetas por hoja con guía de corte.
  - Rollo: una etiqueta por página, del tamaño exacto del rollo y sin márgenes
    (así la impresora térmica avanza etiqueta por etiqueta).
*/
export function hojaDeImpresion(items: ProductoEtiqueta[], opciones: OpcionesEtiqueta, formato: FormatoImpresion): string {
  const etiquetas = items
    .map(item => {
      const svg = etiquetaSvg(item.datos, opciones);
      return Array.from({ length: Math.min(Number(item.copias) || 0, 500) }, () => `<div class="e">${svg}</div>`).join('');
    })
    .join('');

  const estilos = formato.modo === 'rollo'
    ? `
  @page { size: ${formato.ancho}mm ${formato.alto}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .hoja { display: block; }
  .e {
    width: ${formato.ancho}mm; height: ${formato.alto}mm; padding: 1.2mm;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    break-after: page; page-break-after: always;
  }
  .e:last-child { break-after: auto; page-break-after: auto; }
  .e > svg { display: block; width: 100%; height: 100%; }
  @media screen {
    body { background: #e5e7eb; padding: 12px; }
    .e { background: #fff; margin: 0 auto 8px; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  }`
    : `
  @page { margin: 8mm; }
  .hoja { display: flex; flex-wrap: wrap; gap: 3mm; }
  .e { width: ${formato.ancho}; padding: 1.5mm; border: 0.2mm dashed #b5b5b5; break-inside: avoid; page-break-inside: avoid; }
  .e > svg { display: block; width: 100%; height: auto; }`;

  const aviso = formato.modo === 'rollo'
    ? `Rollo de ${formato.ancho} × ${formato.alto} mm: en la ventana de impresión elige la impresora de etiquetas, ` +
      `tamaño de papel ${formato.ancho} × ${formato.alto} mm, márgenes "Ninguno" y escala 100 %.`
    : 'Si no se abre la impresión, usa el menú del navegador → Imprimir. La línea punteada es la guía de corte.';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Etiquetas Pintarte</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .aviso { margin: 0 0 4mm; font-size: 12px; color: #555; }
  @media print { .aviso { display: none; } }${estilos}
</style></head><body>
<p class="aviso">${aviso}</p>
<div class="hoja">${etiquetas}</div>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`;
}

// Medidas comunes de rollos de etiquetas (ancho × alto en mm)
export const ROLLOS: { id: string; ancho: number; alto: number }[] = [
  { id: '40x25', ancho: 40, alto: 25 },
  { id: '50x25', ancho: 50, alto: 25 },
  { id: '50x30', ancho: 50, alto: 30 },
  { id: '50x40', ancho: 50, alto: 40 },
  { id: '60x40', ancho: 60, alto: 40 },
  { id: '70x50', ancho: 70, alto: 50 },
  { id: '100x50', ancho: 100, alto: 50 },
  { id: '100x75', ancho: 100, alto: 75 }
];

interface ProductoEtiqueta {
  producto: IProducto;
  datos: DatosEtiqueta;
  copias: number;
}

type TamanoEtiqueta = 'pequena' | 'mediana' | 'grande';

/*
  Etiquetas con código QR y código de barras para cada producto.
  Los códigos se generan solos a partir de la referencia (ej. DB00001):
  no hay que crearlos ni subirlos a ningún servicio.
*/
@Component({
  selector: 'app-etiquetas',
  imports: [NgFor, NgIf, FormsModule, RouterLink, EtiquetaProducto, Escaner, Icono],
  templateUrl: './etiquetas.html',
  styleUrl: './etiquetas.css'
})
export class Etiquetas implements OnInit {

  productos: ProductoEtiqueta[] = [];
  cargando = false;
  error = '';

  // Filtros
  busqueda = '';
  vista: VistaProductos = 'todos';
  categoriaSeleccionada = '';
  proveedorSeleccionado = '';
  soloSeleccionados = false;
  // Para no generar cientos de etiquetas a la vez en pantalla
  limite = 60;
  readonly vistas: { valor: VistaProductos; nombre: string }[] = [
    { valor: 'todos', nombre: 'Todos' },
    { valor: 'figuras', nombre: 'Figuras' },
    { valor: 'materiales', nombre: 'Pinturas, pinceles y otros' }
  ];
  nombreTipo = nombreTipo;

  // Opciones de impresión
  contenido: ContenidoEtiqueta = 'ambos';
  // Precios que se imprimen en la etiqueta (se leen sin escanear)
  readonly tiposPrecio = PRECIOS_ETIQUETA;
  preciosElegidos: Record<TipoPrecio, boolean> = {
    crudo: true, mayor: true, pintar: true, kit: true, terminada: false
  };
  tamano: TamanoEtiqueta = 'mediana';

  // Impresora normal (hoja carta) o impresora de etiquetas (rollo)
  modoImpresion: 'hoja' | 'rollo' = 'hoja';
  readonly rollos = ROLLOS;
  rolloId = '50x40';           // medida elegida o 'otro'
  rolloAncho = 50;             // solo con 'otro'
  rolloAlto = 40;
  opciones: OpcionesEtiqueta = { contenido: 'ambos', precios: PRECIOS_POR_DEFECTO };
  readonly contenidos: { valor: ContenidoEtiqueta; nombre: string }[] = [
    { valor: 'ambos', nombre: 'QR + código de barras' },
    { valor: 'qr', nombre: 'Solo QR' },
    { valor: 'barras', nombre: 'Solo código de barras' }
  ];
  readonly tamanos: { valor: TamanoEtiqueta; nombre: string }[] = [
    { valor: 'pequena', nombre: 'Pequeña · 5 cm (3 por fila en carta)' },
    { valor: 'mediana', nombre: 'Mediana · 6,2 cm (3 por fila en carta)' },
    { valor: 'grande', nombre: 'Grande · 8 cm (2 por fila en carta)' }
  ];

  // Mensajes
  mensajeEscaneo = '';
  estadoEscaneo: 'ok' | 'error' | '' = '';
  aviso = '';

  constructor(
    private productoService: ProductoService,
    private configuracionService: ConfiguracionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    forkJoin({
      productos: this.productoService.getProductos(),
      configuracion: this.configuracionService.getConfiguracion()
    }).subscribe({
      next: ({ productos, configuracion }) => {
        const valorKit = configuracion.valores.valor_kit_local;
        this.productos = productos.map(producto => ({
          producto,
          datos: this.datosDe(producto, valorKit),
          copias: 0
        }));
        this.cargando = false;

        // ?codigo=25 -> llega desde un producto con 1 copia seleccionada
        const codigo = this.route.snapshot.queryParamMap.get('codigo');
        const elegido = codigo ? this.productos.find(item => String(item.producto.codigo) === codigo) : undefined;
        if (elegido) {
          elegido.copias = 1;
          this.soloSeleccionados = true;
        }
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  private datosDe(producto: IProducto, valorKit: number): DatosEtiqueta {
    const detalle = producto.tipo === 'pintura' ? producto.coleccion : producto.tamano;
    return {
      codigo: codigoDeProducto(producto),
      nombre: producto.nombre,
      detalle: detalle || '',
      esFigura: producto.tipo === 'figura',
      precios: preciosDeProducto(producto, valorKit)
    };
  }


  // ================================
  // FILTROS Y SELECCIÓN
  // ================================

  get filtrados(): ProductoEtiqueta[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.productos.filter(({ producto, copias }) =>
      (!this.soloSeleccionados || copias > 0) &&
      coincideVista(producto.tipo, this.vista) &&
      (!this.proveedorSeleccionado || producto.proveedor === this.proveedorSeleccionado) &&
      (!this.categoriaSeleccionada ||
        (producto.tipo === 'figura' && coincideCategoria(producto.categoria, this.categoriaSeleccionada))) &&
      (!texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.referencia ?? '').toLowerCase().includes(texto))
    );
  }

  get visibles(): ProductoEtiqueta[] {
    return this.filtrados.slice(0, this.limite);
  }

  mostrarMas(): void {
    this.limite += 60;
  }

  get categorias(): string[] {
    return categoriasDe(this.productos.map(item => item.producto));
  }

  get proveedores(): string[] {
    return [...new Set(this.productos.map(item => item.producto.proveedor).filter(Boolean))].sort();
  }

  get seleccionados(): ProductoEtiqueta[] {
    return this.productos.filter(item => item.copias > 0);
  }

  get totalEtiquetas(): number {
    return this.seleccionados.reduce((total, item) => total + item.copias, 0);
  }

  cambiarCopias(item: ProductoEtiqueta, delta: number): void {
    item.copias = Math.max(0, Math.min(500, (Number(item.copias) || 0) + delta));
  }

  seleccionarFiltrados(): void {
    this.filtrados.forEach(item => {
      if (item.copias === 0) {
        item.copias = 1;
      }
    });
  }

  limpiarSeleccion(): void {
    this.productos.forEach(item => (item.copias = 0));
    this.soloSeleccionados = false;
  }

  // Escanear una etiqueta suma una copia (útil para reimprimir etiquetas dañadas)
  agregarPorCodigo(codigo: string): void {
    const item = buscarPorCodigo(this.productos.map(p => ({ ...p.producto, item: p })), codigo)?.item;
    if (!item) {
      this.estadoEscaneo = 'error';
      this.mensajeEscaneo = `No hay ningún producto con el código "${codigo}".`;
      return;
    }
    this.cambiarCopias(item, 1);
    this.estadoEscaneo = 'ok';
    this.mensajeEscaneo = `${item.producto.nombre}: ${item.copias} etiqueta(s).`;
  }


  // ================================
  // OPCIONES
  // ================================

  actualizarOpciones(): void {
    this.opciones = {
      contenido: this.contenido,
      precios: PRECIOS_ETIQUETA.map(tipo => tipo.valor).filter(tipo => this.preciosElegidos[tipo])
    };
  }

  // Medida de la etiqueta del rollo en mm
  get rollo(): { ancho: number; alto: number } {
    if (this.rolloId === 'otro') {
      return {
        ancho: Math.min(150, Math.max(20, Number(this.rolloAncho) || 50)),
        alto: Math.min(200, Math.max(10, Number(this.rolloAlto) || 30))
      };
    }
    return ROLLOS.find(rollo => rollo.id === this.rolloId) ?? ROLLOS[3];
  }

  // Proporción de la vista previa (ancho / alto) en modo rollo
  get proporcionRollo(): string {
    return `${this.rollo.ancho} / ${this.rollo.alto}`;
  }

  // Rollos bajitos: con QR + barras + precios todo queda muy pequeño
  get rolloAjustado(): boolean {
    const { ancho, alto } = this.rollo;
    const cantidadPrecios = this.opciones.precios.length;
    return this.modoImpresion === 'rollo' && (
      (alto / ancho < 0.7 && this.contenido === 'ambos') ||
      (alto <= 25 && cantidadPrecios > 2)
    );
  }

  usarSoloQr(): void {
    this.contenido = 'qr';
    this.actualizarOpciones();
  }

  get formatoImpresion(): FormatoImpresion {
    return this.modoImpresion === 'rollo'
      ? { modo: 'rollo', ...this.rollo }
      : { modo: 'hoja', ancho: this.anchoEtiqueta };
  }

  get anchoEtiqueta(): string {
    return { pequena: '50mm', mediana: '62mm', grande: '80mm' }[this.tamano];
  }


  // ================================
  // IMPRIMIR, DESCARGAR Y COPIAR
  // ================================

  /*
    Abre una ventana solo con las etiquetas y la manda a imprimir.
    Desde ahí también se puede "Guardar como PDF".
  */
  imprimir(): void {
    if (!this.totalEtiquetas) {
      this.aviso = 'Elige al menos un producto y cuántas etiquetas quieres.';
      return;
    }
    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.aviso = 'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para este sitio.';
      return;
    }
    this.aviso = '';
    ventana.document.open();
    ventana.document.write(hojaDeImpresion(this.seleccionados, this.opciones, this.formatoImpresion));
    ventana.document.close();
  }

  async descargar(item: ProductoEtiqueta): Promise<void> {
    try {
      await descargarSvgComoPng(
        etiquetaSvg(item.datos, this.opciones),
        nombreArchivo(item.datos.codigo, item.producto.nombre),
        3
      );
    } catch (error) {
      this.aviso = (error as Error).message;
    }
  }

  async copiarImagen(item: ProductoEtiqueta): Promise<void> {
    try {
      await copiarSvgComoImagen(etiquetaSvg(item.datos, this.opciones), 3);
      this.aviso = `Etiqueta de "${item.producto.nombre}" copiada. Pégala donde la necesites.`;
    } catch (error) {
      this.aviso = (error as Error).message;
    }
  }

  async copiarCodigo(item: ProductoEtiqueta): Promise<void> {
    try {
      await copiarTexto(item.datos.codigo);
      this.aviso = `Código ${item.datos.codigo} copiado.`;
    } catch {
      this.aviso = 'No se pudo copiar el código.';
    }
  }

  // Descarga una por una las etiquetas elegidas (una imagen por producto)
  async descargarSeleccionadas(): Promise<void> {
    if (!this.seleccionados.length) {
      this.aviso = 'Elige al menos un producto.';
      return;
    }
    for (const item of this.seleccionados) {
      await this.descargar(item);
      await new Promise(resolver => setTimeout(resolver, 350));
    }
  }

  trackPorCodigo(_: number, item: ProductoEtiqueta): number {
    return item.producto.codigo;
  }
}
