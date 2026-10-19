import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FacturaService } from '../../services/factura.service';
import { VentaService } from '../../services/venta.service';
import {
  EstadoFactura, IDatosFacturacion, IFactura, TipoFactura
} from '../../interfaces/factura.interface';
import { IVenta } from '../../interfaces/venta.interface';
import { Facturar } from '../../components/facturar/facturar';
import { mensajeDeError } from '../../utils/http-error';
import { imprimirFactura, pesos } from '../../utils/factura-impresion';

type Pestana = 'emitidas' | 'pendientes' | 'datos';

interface CampoDato {
  clave: string;
  titulo: string;
  tipo?: 'texto' | 'numero' | 'fecha' | 'si-no' | 'select';
  opciones?: { valor: string; nombre: string }[];
  ayuda?: string;
  ancho?: boolean;
}

/*
  Facturación:
    - Facturas emitidas: imprimir, registrar el CUFE/CUDE que da la DIAN,
      pasar una tirilla a factura electrónica o anular.
    - Ventas sin facturar: emitir su tirilla o factura.
    - Datos del negocio: NIT, resoluciones DIAN, IVA... (bases para cuando se
      tengan los papeles de la DIAN y el proveedor tecnológico).
*/
@Component({
  selector: 'app-facturas',
  imports: [NgFor, NgIf, FormsModule, DatePipe, Facturar],
  templateUrl: './facturas.html',
  styleUrl: './facturas.css'
})
export class Facturas implements OnInit {

  pestana: Pestana = 'emitidas';

  facturas: IFactura[] = [];
  ventasPendientes: IVenta[] = [];
  ventas: IVenta[] = [];
  cargando = false;
  error = '';
  aviso = '';

  // Filtros de facturas emitidas
  filtroTipo: '' | TipoFactura = '';
  filtroEstado: '' | EstadoFactura = '';
  busqueda = '';

  // Ventana para facturar
  ventaAFacturar: IVenta | null = null;
  tipoInicial: TipoFactura = 'pos';

  // Datos del negocio
  datos: IDatosFacturacion = {};
  guardandoDatos = false;
  mensajeDatos = '';
  errorDatos = '';

  pesos = pesos;

  readonly nombresEstado: Record<EstadoFactura, string> = {
    pendiente_envio: 'Pendiente DIAN',
    aceptada: 'Aceptada DIAN',
    rechazada: 'Rechazada DIAN',
    anulada: 'Anulada'
  };

  readonly siNo = [{ valor: 'no', nombre: 'No' }, { valor: 'si', nombre: 'Sí' }];

  readonly secciones: { titulo: string; ayuda: string; campos: CampoDato[] }[] = [
    {
      titulo: 'Emisor',
      ayuda: 'Datos del RUT del negocio. Aparecen en el encabezado de la tirilla y de la factura.',
      campos: [
        { clave: 'nombre_comercial', titulo: 'Nombre comercial' },
        { clave: 'razon_social', titulo: 'Razón social o nombre del titular' },
        {
          clave: 'tipo_persona', titulo: 'Tipo de persona', tipo: 'select',
          opciones: [{ valor: 'natural', nombre: 'Persona natural' }, { valor: 'juridica', nombre: 'Persona jurídica' }]
        },
        { clave: 'nit', titulo: 'NIT (sin dígito de verificación)' },
        { clave: 'dv', titulo: 'Dígito de verificación (DV)' },
        { clave: 'actividad_economica', titulo: 'Actividad económica (CIIU)' },
        { clave: 'direccion', titulo: 'Dirección' },
        { clave: 'ciudad', titulo: 'Ciudad' },
        { clave: 'departamento', titulo: 'Departamento' },
        { clave: 'telefono', titulo: 'Teléfono' },
        { clave: 'correo', titulo: 'Correo' }
      ]
    },
    {
      titulo: 'Impuestos y calidades tributarias',
      ayuda: 'Confírmalo con el contador. Si es responsable de IVA, la factura discrimina el IVA de cada producto.',
      campos: [
        { clave: 'responsable_iva', titulo: '¿Responsable de IVA?', tipo: 'si-no' },
        { clave: 'tarifa_iva', titulo: 'Tarifa de IVA (%)', tipo: 'numero' },
        {
          clave: 'precios_incluyen_iva', titulo: '¿Los precios del sistema ya incluyen IVA?', tipo: 'si-no',
          ayuda: 'Normalmente sí: el precio que paga el cliente no cambia y el IVA se separa en la factura.'
        },
        { clave: 'regimen_simple', titulo: '¿Régimen Simple de Tributación?', tipo: 'si-no' },
        { clave: 'gran_contribuyente', titulo: '¿Gran contribuyente?', tipo: 'si-no' },
        { clave: 'autorretenedor', titulo: '¿Autorretenedor de renta?', tipo: 'si-no' },
        { clave: 'agente_retencion_iva', titulo: '¿Agente de retención de IVA?', tipo: 'si-no' }
      ]
    },
    {
      titulo: 'Numeración DIAN · Tirilla POS',
      ayuda: 'Resolución de autorización de numeración del documento equivalente electrónico POS.',
      campos: [
        { clave: 'pos_resolucion', titulo: 'Número de resolución' },
        { clave: 'pos_fecha_resolucion', titulo: 'Fecha de la resolución', tipo: 'fecha' },
        { clave: 'pos_prefijo', titulo: 'Prefijo (ej. POS)' },
        { clave: 'pos_desde', titulo: 'Desde el número', tipo: 'numero' },
        { clave: 'pos_hasta', titulo: 'Hasta el número', tipo: 'numero' },
        { clave: 'pos_vigencia_hasta', titulo: 'Vigente hasta', tipo: 'fecha' },
        { clave: 'pos_caja', titulo: 'Nombre de la caja' }
      ]
    },
    {
      titulo: 'Numeración DIAN · Factura electrónica',
      ayuda: 'Resolución de autorización de numeración de la factura electrónica de venta.',
      campos: [
        { clave: 'fe_resolucion', titulo: 'Número de resolución' },
        { clave: 'fe_fecha_resolucion', titulo: 'Fecha de la resolución', tipo: 'fecha' },
        { clave: 'fe_prefijo', titulo: 'Prefijo (ej. FE)' },
        { clave: 'fe_desde', titulo: 'Desde el número', tipo: 'numero' },
        { clave: 'fe_hasta', titulo: 'Hasta el número', tipo: 'numero' },
        { clave: 'fe_vigencia_hasta', titulo: 'Vigente hasta', tipo: 'fecha' }
      ]
    },
    {
      titulo: 'Software y proveedor tecnológico',
      ayuda: 'El proveedor tecnológico (o la solución gratuita de la DIAN) firma, envía a la DIAN y asigna el CUFE/CUDE.',
      campos: [
        { clave: 'software_nombre', titulo: 'Nombre del software' },
        { clave: 'software_fabricante', titulo: 'Fabricante del software' },
        { clave: 'software_nit', titulo: 'NIT del fabricante' },
        { clave: 'proveedor_tecnologico', titulo: 'Proveedor tecnológico' }
      ]
    },
    {
      titulo: 'Impresión',
      ayuda: 'Ancho del rollo de la impresora de tirillas y mensajes al pie.',
      campos: [
        {
          clave: 'ancho_tirilla', titulo: 'Ancho de la tirilla', tipo: 'select',
          opciones: [{ valor: '80', nombre: '80 mm' }, { valor: '58', nombre: '58 mm' }]
        },
        { clave: 'mensaje_pie', titulo: 'Mensaje al pie', ancho: true },
        { clave: 'politica_cambios', titulo: 'Política de cambios y devoluciones', ancho: true }
      ]
    }
  ];

  constructor(
    private facturaService: FacturaService,
    private ventaService: VentaService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const pestana = this.route.snapshot.queryParamMap.get('pestana');
    if (pestana === 'pendientes' || pestana === 'datos') {
      this.pestana = pestana;
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    forkJoin({
      facturas: this.facturaService.getFacturas(),
      pendientes: this.facturaService.getVentasSinFactura(),
      ventas: this.ventaService.getVentas(),
      datos: this.facturaService.getDatos()
    }).subscribe({
      next: ({ facturas, pendientes, ventas, datos }) => {
        this.facturas = facturas;
        this.ventasPendientes = pendientes;
        this.ventas = ventas;
        this.datos = { ...datos.datos };
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }


  // ================================
  // FACTURAS EMITIDAS
  // ================================

  get facturasFiltradas(): IFactura[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.facturas.filter(f =>
      (!this.filtroTipo || f.tipo === this.filtroTipo) &&
      (!this.filtroEstado || f.estado === this.filtroEstado) &&
      (!texto ||
        f.numero_completo.toLowerCase().includes(texto) ||
        f.cliente.nombre.toLowerCase().includes(texto) ||
        f.cliente.documento.includes(texto) ||
        String(f.venta ?? '').includes(texto))
    );
  }

  get totalFacturado(): number {
    return this.facturasFiltradas.filter(f => f.estado !== 'anulada').reduce((total, f) => total + f.total, 0);
  }

  imprimir(factura: IFactura): void {
    if (!imprimirFactura(factura)) {
      this.aviso = 'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para este sitio.';
    }
  }

  registrarCufe(factura: IFactura): void {
    const nombre = factura.tipo === 'pos' ? 'CUDE' : 'CUFE';
    const cufe = prompt(`${nombre} que asignó la DIAN a ${factura.numero_completo}:`, factura.cufe);
    if (cufe === null) {
      return;
    }
    this.facturaService.registrarValidacion(factura.codigo, {
      cufe: cufe.trim(),
      estado: cufe.trim() ? 'aceptada' : 'pendiente_envio'
    }).subscribe({
      next: actualizada => {
        this.reemplazar(actualizada);
        this.aviso = cufe.trim()
          ? `${factura.numero_completo} quedó como aceptada por la DIAN.`
          : `${factura.numero_completo} quedó pendiente de validación.`;
      },
      error: err => (this.aviso = mensajeDeError(err))
    });
  }

  anular(factura: IFactura): void {
    const motivo = prompt(
      `Motivo para anular ${factura.numero_completo}` +
      (factura.cufe ? '\n(Ante la DIAN también debes emitir una nota crédito con tu proveedor tecnológico.)' : ''),
      ''
    );
    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.aviso = 'Escribe el motivo de la anulación.';
      return;
    }
    this.facturaService.anularFactura(factura.codigo, motivo.trim()).subscribe({
      next: () => {
        this.aviso = `${factura.numero_completo} anulada.`;
        this.cargar();
      },
      error: err => (this.aviso = mensajeDeError(err))
    });
  }

  // El cliente pide factura electrónica de una venta que tenía tirilla
  pasarAElectronica(factura: IFactura): void {
    const venta = this.ventas.find(v => v.codigo === factura.venta);
    if (!venta) {
      this.aviso = 'No se encontró la venta de esta tirilla.';
      return;
    }
    this.tipoInicial = 'electronica';
    this.ventaAFacturar = venta;
  }

  private reemplazar(factura: IFactura): void {
    this.facturas = this.facturas.map(f => (f.codigo === factura.codigo ? factura : f));
  }


  // ================================
  // VENTAS SIN FACTURA
  // ================================

  facturarVenta(venta: IVenta, tipo: TipoFactura): void {
    this.tipoInicial = tipo;
    this.ventaAFacturar = venta;
  }

  alEmitir(factura: IFactura): void {
    this.ventaAFacturar = null;
    this.aviso = `${factura.tipo === 'pos' ? 'Tirilla' : 'Factura electrónica'} ${factura.numero_completo} emitida.`;
    this.pestana = 'emitidas';
    this.cargar();
  }


  // ================================
  // DATOS DEL NEGOCIO
  // ================================

  get resolucionPosLista(): boolean {
    return !!(this.datos['pos_resolucion'] && this.datos['pos_hasta'] && this.datos['pos_vigencia_hasta']);
  }

  get resolucionFeLista(): boolean {
    return !!(this.datos['fe_resolucion'] && this.datos['fe_hasta'] && this.datos['fe_vigencia_hasta']);
  }

  guardarDatos(): void {
    this.guardandoDatos = true;
    this.mensajeDatos = '';
    this.errorDatos = '';
    this.facturaService.guardarDatos(this.datos).subscribe({
      next: respuesta => {
        this.guardandoDatos = false;
        this.datos = { ...respuesta.datos };
        this.mensajeDatos = 'Datos de facturación guardados. Las nuevas facturas los usarán.';
      },
      error: err => {
        this.guardandoDatos = false;
        this.errorDatos = mensajeDeError(err);
      }
    });
  }

  trackFactura(_: number, f: IFactura): number {
    return f.codigo;
  }
}
