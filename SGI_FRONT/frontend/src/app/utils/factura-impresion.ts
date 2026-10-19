import { IFactura } from '../interfaces/factura.interface';
import { escaparXml } from './codigo-barras';
import { qrSvg } from './qr';

/*
  Representación gráfica (para imprimir) de la tirilla POS y de la factura
  electrónica, en el orden que pide la norma colombiana (ET art. 617 y
  Resolución DIAN 000165 de 2023):

    1. Emisor: nombre comercial, razón social, NIT, calidades tributarias y contacto
    2. Denominación del documento y número consecutivo
    3. Resolución de numeración DIAN (número, fecha, prefijo, rango y vigencia)
    4. Fecha y hora, caja y cajero
    5. Adquirente (o consumidor final 222222222222)
    6. Detalle: cantidad, código, descripción, valor unitario y total
    7. Totales con el IVA discriminado, forma y medio de pago
    8. CUFE/CUDE y código QR
    9. Software y proveedor tecnológico
   10. Mensajes del negocio
*/

const DIAN_QR = 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=';

const e = (texto: unknown): string => escaparXml(String(texto ?? ''));

export function pesos(valor: number): string {
  return '$' + Math.round(Number(valor) || 0).toLocaleString('es-CO');
}

function fechaHora(iso: string): string {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  return isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function nit(f: IFactura): string {
  return f.emisor.nit ? `NIT ${f.emisor.nit}${f.emisor.dv ? '-' + f.emisor.dv : ''}` : 'NIT: (sin registrar)';
}

// Texto del QR: la consulta en la DIAN cuando ya hay CUFE/CUDE; si no, los datos básicos
function contenidoQr(f: IFactura): string {
  if (f.cufe) {
    return DIAN_QR + f.cufe;
  }
  return [
    `NumFac: ${f.numero_completo}`,
    `FecFac: ${(f.fecha || '').slice(0, 10)}`,
    `NitFac: ${f.emisor.nit || ''}`,
    `DocAdq: ${f.cliente.documento}`,
    `ValFac: ${f.subtotal}`,
    `ValIva: ${f.iva}`,
    `ValTolFac: ${f.total}`
  ].join('\n');
}

// Avisos que se imprimen arriba del documento
function avisos(f: IFactura): string[] {
  const lista: string[] = [];
  if (f.estado === 'anulada') {
    lista.push('DOCUMENTO ANULADO');
  }
  if (!f.emisor.resolucion?.completa) {
    lista.push('SIN VALIDEZ FISCAL: falta registrar la resolución de numeración DIAN');
  } else if (f.estado === 'pendiente_envio') {
    lista.push('Pendiente de validación DIAN');
  } else if (f.estado === 'rechazada') {
    lista.push('RECHAZADA POR LA DIAN');
  }
  return lista;
}

function resolucionTexto(f: IFactura): string {
  const r = f.emisor.resolucion;
  if (!r?.numero) {
    return 'Numeración: pendiente de autorización DIAN';
  }
  return `Resolución DIAN No. ${e(r.numero)} del ${e(r.fecha)} · Prefijo ${e(r.prefijo || '—')} ` +
    `del ${e(r.prefijo)}${r.desde} al ${e(r.prefijo)}${r.hasta ?? ''} · Vigencia hasta ${e(r.vigencia_hasta)}`;
}

function bloqueIva(f: IFactura): { tarifa: number; base: number; iva: number }[] {
  const grupos = new Map<number, { tarifa: number; base: number; iva: number }>();
  f.detalle.forEach(linea => {
    const grupo = grupos.get(linea.tarifa_iva) ?? { tarifa: linea.tarifa_iva, base: 0, iva: 0 };
    grupo.base += linea.base;
    grupo.iva += linea.iva;
    grupos.set(linea.tarifa_iva, grupo);
  });
  return [...grupos.values()];
}

function cliente(f: IFactura, completo: boolean): string {
  const c = f.cliente;
  const filas = [
    `<div><b>Cliente:</b> ${e(c.nombre)}</div>`,
    `<div><b>${e(c.tipo_documento)}:</b> ${e(c.documento)}</div>`
  ];
  if (completo || c.direccion) {
    filas.push(c.direccion ? `<div><b>Dirección:</b> ${e(c.direccion)}</div>` : '');
  }
  if (c.telefono) {
    filas.push(`<div><b>Teléfono:</b> ${e(c.telefono)}</div>`);
  }
  if (c.correo) {
    filas.push(`<div><b>Correo:</b> ${e(c.correo)}</div>`);
  }
  return filas.join('');
}

function pago(f: IFactura): string {
  return [
    `<div class="fila"><span>Forma de pago</span><span>${e(f.forma_pago)}</span></div>`,
    f.fecha_vencimiento ? `<div class="fila"><span>Vence</span><span>${e(f.fecha_vencimiento)}</span></div>` : '',
    `<div class="fila"><span>Medio de pago</span><span>${e(f.medio_pago)}</span></div>`,
    f.recibido ? `<div class="fila"><span>Recibido</span><span>${pesos(f.recibido)}</span></div>` : '',
    f.recibido ? `<div class="fila"><span>Cambio</span><span>${pesos(f.cambio)}</span></div>` : ''
  ].join('');
}

function software(f: IFactura): string {
  const s = f.emisor.software;
  const partes = [
    s.nombre ? `Software: ${e(s.nombre)}` : '',
    s.fabricante ? `Fabricante: ${e(s.fabricante)}${s.nit ? ' NIT ' + e(s.nit) : ''}` : '',
    s.proveedor_tecnologico ? `Proveedor tecnológico: ${e(s.proveedor_tecnologico)}` : ''
  ].filter(Boolean);
  return partes.join(' · ');
}

const SCRIPT_IMPRIMIR =
  `<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>`;


// ================================
// TIRILLA (documento equivalente POS)
// ================================

export function tirillaHtml(f: IFactura, imprimir = true): string {
  const ancho = Number(f.emisor.ancho_tirilla) === 58 ? 58 : 80;
  const letra = ancho === 58 ? 9.5 : 11;

  const lineas = f.detalle.map(linea => `
    <div class="item">
      <div>${e(linea.descripcion)}</div>
      <div class="fila sub">
        <span>${linea.cantidad} x ${pesos(linea.valor_unitario)}${linea.codigo ? ' · ' + e(linea.codigo) : ''}${f.emisor.responsable_iva ? ' · IVA ' + linea.tarifa_iva + '%' : ''}</span>
        <span>${pesos(linea.total)}</span>
      </div>
    </div>`).join('');

  const iva = f.emisor.responsable_iva
    ? bloqueIva(f).map(g =>
        `<div class="fila"><span>Base IVA ${g.tarifa}%</span><span>${pesos(g.base)}</span></div>` +
        `<div class="fila"><span>IVA ${g.tarifa}%</span><span>${pesos(g.iva)}</span></div>`).join('')
    : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(f.numero_completo)} · ${e(f.emisor.nombre_comercial || 'Tirilla')}</title>
<style>
  @page { size: ${ancho}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #000; }
  .t { width: ${ancho}mm; padding: 3mm ${ancho === 58 ? 2 : 3.5}mm 6mm; font: ${letra}px/1.35 'Courier New', monospace; }
  .centro { text-align: center; }
  .grande { font-size: ${letra + 3}px; font-weight: 700; }
  .neg { font-weight: 700; }
  hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
  .fila { display: flex; justify-content: space-between; gap: 2mm; }
  .fila span:last-child { text-align: right; white-space: nowrap; }
  .sub { color: #000; }
  .item { margin-bottom: 1.2mm; }
  .total { font-size: ${letra + 2}px; font-weight: 700; }
  .aviso { border: 1px solid #000; padding: 1mm; margin: 1.5mm 0; text-align: center; font-weight: 700; }
  .qr { width: ${ancho === 58 ? 34 : 36}mm; margin: 2mm auto; }
  .qr svg { display: block; width: 100%; height: auto; }
  .chico { font-size: ${letra - 1.5}px; word-break: break-all; }
  @media screen { body { background: #e5e7eb; padding: 12px; } .t { background: #fff; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,.25); } }
</style></head><body><div class="t">
  <div class="centro">
    <div class="grande">${e(f.emisor.nombre_comercial || f.emisor.razon_social)}</div>
    ${f.emisor.razon_social && f.emisor.razon_social !== f.emisor.nombre_comercial ? `<div>${e(f.emisor.razon_social)}</div>` : ''}
    <div>${e(nit(f))}</div>
    ${f.emisor.calidades.map(c => `<div>${e(c)}</div>`).join('')}
    ${f.emisor.direccion ? `<div>${e(f.emisor.direccion)}${f.emisor.ciudad ? ', ' + e(f.emisor.ciudad) : ''}</div>` : ''}
    ${f.emisor.telefono ? `<div>Tel. ${e(f.emisor.telefono)}</div>` : ''}
  </div>
  <hr>
  <div class="centro neg">${e(f.emisor.denominacion.toUpperCase())}</div>
  <div class="centro grande">No. ${e(f.numero_completo)}</div>
  <div class="centro chico">${resolucionTexto(f)}</div>
  ${avisos(f).map(a => `<div class="aviso">${e(a)}</div>`).join('')}
  <hr>
  <div class="fila"><span>Fecha</span><span>${e(fechaHora(f.fecha))}</span></div>
  ${f.emisor.caja ? `<div class="fila"><span>Caja</span><span>${e(f.emisor.caja)}</span></div>` : ''}
  ${f.usuario ? `<div class="fila"><span>Cajero</span><span>${e(f.usuario)}</span></div>` : ''}
  ${f.venta ? `<div class="fila"><span>Venta</span><span>#${f.venta}</span></div>` : ''}
  <hr>
  ${cliente(f, false)}
  <hr>
  ${lineas}
  <hr>
  ${f.emisor.responsable_iva ? `<div class="fila"><span>Subtotal</span><span>${pesos(f.subtotal)}</span></div>` : ''}
  ${iva}
  <div class="fila total"><span>TOTAL</span><span>${pesos(f.total)}</span></div>
  <hr>
  ${pago(f)}
  <hr>
  <div class="chico"><b>CUDE:</b> ${f.cufe ? e(f.cufe) : 'pendiente (se asigna al validar en la DIAN)'}</div>
  <div class="qr">${qrSvg(contenidoQr(f))}</div>
  <div class="centro chico">${software(f)}</div>
  ${f.emisor.mensaje_pie ? `<hr><div class="centro">${e(f.emisor.mensaje_pie)}</div>` : ''}
  ${f.emisor.politica_cambios ? `<div class="centro chico">${e(f.emisor.politica_cambios)}</div>` : ''}
  ${f.observaciones ? `<div class="centro chico">${e(f.observaciones)}</div>` : ''}
</div>${imprimir ? SCRIPT_IMPRIMIR : ''}</body></html>`;
}


// ================================
// FACTURA ELECTRÓNICA (hoja carta)
// ================================

export function facturaCartaHtml(f: IFactura, imprimir = true): string {
  const conIva = f.emisor.responsable_iva;
  const filas = f.detalle.map((linea, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e(linea.codigo)}</td>
      <td>${e(linea.descripcion)}</td>
      <td class="num">${linea.cantidad}</td>
      <td>${e(linea.unidad)}</td>
      <td class="num">${pesos(linea.valor_unitario)}</td>
      ${conIva ? `<td class="num">${pesos(linea.base)}</td><td class="num">${linea.tarifa_iva}%</td><td class="num">${pesos(linea.iva)}</td>` : ''}
      <td class="num">${pesos(linea.total)}</td>
    </tr>`).join('');

  const iva = conIva
    ? bloqueIva(f).map(g => `<tr><td>IVA ${g.tarifa}% (base ${pesos(g.base)})</td><td class="num">${pesos(g.iva)}</td></tr>`).join('')
    : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(f.numero_completo)} · Factura electrónica</title>
<style>
  @page { size: letter; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.4 Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  .hoja { max-width: 190mm; margin: 0 auto; }
  .cabeza { display: grid; grid-template-columns: 1fr 62mm; gap: 6mm; align-items: start; }
  h1 { margin: 0 0 1mm; font-size: 18px; }
  .caja { border: 1px solid #333; border-radius: 2mm; padding: 3mm; }
  .caja h2 { margin: 0 0 1mm; font-size: 12px; text-transform: uppercase; }
  .numero { font-size: 16px; font-weight: 700; }
  .aviso { margin: 3mm 0; padding: 2mm; border: 1.5px solid #000; text-align: center; font-weight: 700; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 4mm 0; }
  table { width: 100%; border-collapse: collapse; }
  .items th, .items td { border-bottom: 1px solid #ccc; padding: 1.5mm 1.5mm; text-align: left; vertical-align: top; }
  .items th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; }
  .num { text-align: right; white-space: nowrap; }
  .pie { display: grid; grid-template-columns: 1fr 70mm; gap: 6mm; margin-top: 4mm; align-items: start; }
  .totales td { padding: 1mm 0; }
  .totales .total td { font-size: 14px; font-weight: 700; border-top: 1.5px solid #000; padding-top: 2mm; }
  .qr { width: 40mm; }
  .qr svg { display: block; width: 100%; height: auto; }
  .chico { font-size: 9.5px; color: #333; word-break: break-all; }
  @media screen { body { background: #e5e7eb; padding: 16px; } .hoja { background: #fff; padding: 12mm; box-shadow: 0 1px 4px rgba(0,0,0,.25); } }
</style></head><body><div class="hoja">
  <div class="cabeza">
    <div>
      <h1>${e(f.emisor.nombre_comercial || f.emisor.razon_social)}</h1>
      ${f.emisor.razon_social ? `<div>${e(f.emisor.razon_social)}</div>` : ''}
      <div><b>${e(nit(f))}</b></div>
      ${f.emisor.calidades.length ? `<div>${f.emisor.calidades.map(e).join(' · ')}</div>` : ''}
      ${f.emisor.actividad_economica ? `<div>Actividad económica (CIIU): ${e(f.emisor.actividad_economica)}</div>` : ''}
      <div>${[f.emisor.direccion, f.emisor.ciudad, f.emisor.departamento].filter(Boolean).map(e).join(', ')}</div>
      <div>${[f.emisor.telefono ? 'Tel. ' + e(f.emisor.telefono) : '', e(f.emisor.correo)].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="caja">
      <h2>${e(f.emisor.denominacion)}</h2>
      <div class="numero">No. ${e(f.numero_completo)}</div>
      <div>Fecha y hora: ${e(fechaHora(f.fecha))}</div>
      ${f.fecha_vencimiento ? `<div>Vencimiento: ${e(f.fecha_vencimiento)}</div>` : ''}
      <div class="chico">${resolucionTexto(f)}</div>
    </div>
  </div>

  ${avisos(f).map(a => `<div class="aviso">${e(a)}</div>`).join('')}

  <div class="dos">
    <div class="caja">
      <h2>Adquirente</h2>
      ${cliente(f, true)}
    </div>
    <div class="caja">
      <h2>Pago</h2>
      <div><b>Forma de pago:</b> ${e(f.forma_pago)}</div>
      <div><b>Medio de pago:</b> ${e(f.medio_pago)}</div>
      ${f.venta ? `<div><b>Venta interna:</b> #${f.venta}</div>` : ''}
      ${f.usuario ? `<div><b>Elaboró:</b> ${e(f.usuario)}</div>` : ''}
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th>#</th><th>Código</th><th>Descripción</th><th class="num">Cant.</th><th>Und.</th><th class="num">Vr. unitario</th>
      ${conIva ? '<th class="num">Base</th><th class="num">IVA %</th><th class="num">IVA</th>' : ''}
      <th class="num">Total</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="pie">
    <div>
      <div class="chico"><b>CUFE:</b> ${f.cufe ? e(f.cufe) : 'pendiente (se asigna cuando la DIAN valida la factura)'}</div>
      <div class="qr">${qrSvg(contenidoQr(f))}</div>
      <div class="chico">${software(f)}</div>
      ${f.observaciones ? `<p class="chico"><b>Observaciones:</b> ${e(f.observaciones)}</p>` : ''}
      ${f.emisor.politica_cambios ? `<p class="chico">${e(f.emisor.politica_cambios)}</p>` : ''}
    </div>
    <table class="totales">
      ${conIva ? `<tr><td>Subtotal (base)</td><td class="num">${pesos(f.subtotal)}</td></tr>` : ''}
      ${f.descuento ? `<tr><td>Descuento</td><td class="num">-${pesos(f.descuento)}</td></tr>` : ''}
      ${iva}
      ${!conIva ? `<tr><td>No responsable de IVA</td><td class="num"></td></tr>` : ''}
      <tr class="total"><td>TOTAL A PAGAR</td><td class="num">${pesos(f.total)}</td></tr>
    </table>
  </div>
</div>${imprimir ? SCRIPT_IMPRIMIR : ''}</body></html>`;
}

// Abre una ventana con el documento y lo manda a imprimir (o guardar en PDF)
export function imprimirFactura(f: IFactura): boolean {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    return false;
  }
  ventana.document.open();
  ventana.document.write(f.tipo === 'pos' ? tirillaHtml(f) : facturaCartaHtml(f));
  ventana.document.close();
  return true;
}
