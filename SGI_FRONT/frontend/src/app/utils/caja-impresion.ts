import { ICaja, IResumenCaja } from '../interfaces/caja.interface';
import { escaparXml } from './codigo-barras';

/*
  Comprobante del cierre de caja (tirilla de 80 mm, también sirve en carta).
*/

const e = (texto: unknown): string => escaparXml(String(texto ?? ''));

function pesos(valor: number | null | undefined): string {
  const numero = Math.round(Number(valor) || 0);
  return (numero < 0 ? '-$' : '$') + Math.abs(numero).toLocaleString('es-CO');
}

function hora(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  return isNaN(fecha.getTime()) ? iso : fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function textoDiferencia(diferencia: number | null): string {
  if (diferencia === null || diferencia === undefined) {
    return '';
  }
  if (diferencia === 0) {
    return 'Cuadra';
  }
  return diferencia > 0 ? `Sobran ${pesos(diferencia)}` : `Faltan ${pesos(-diferencia)}`;
}

export function cierreCajaHtml(caja: ICaja, nombreNegocio = 'Pintarte'): string {
  const r: IResumenCaja | undefined = caja.resumen ?? caja.resumen_actual;
  const fila = (a: string, b: string, clase = '') => `<div class="fila ${clase}"><span>${a}</span><span>${b}</span></div>`;

  const medios = (r?.por_medio ?? [])
    .map(m => fila(`${e(m.medio)} (${m.pagos})`, pesos(m.valor)))
    .join('');

  const movimientos = (r?.movimientos ?? [])
    .map(m => fila(`${m.tipo === 'entrada' ? '+' : '−'} ${e(m.categoria || m.motivo)}`, pesos(m.tipo === 'entrada' ? m.valor : -m.valor)))
    .join('');

  const conteo = caja.conteo
    ? Object.entries(caja.conteo)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([denominacion, cantidad]) => fila(`${cantidad} × ${pesos(Number(denominacion))}`, pesos(Number(denominacion) * cantidad)))
        .join('')
    : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cierre de caja ${e(caja.fecha)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #000; }
  .t { width: 80mm; padding: 4mm 4mm 8mm; font: 11px/1.4 'Courier New', monospace; }
  .centro { text-align: center; }
  .grande { font-size: 14px; font-weight: 700; }
  hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
  .fila { display: flex; justify-content: space-between; gap: 2mm; }
  .fila span:last-child { white-space: nowrap; text-align: right; }
  .neg { font-weight: 700; }
  .total { font-size: 13px; font-weight: 700; }
  .firma { margin-top: 10mm; border-top: 1px solid #000; padding-top: 1mm; text-align: center; }
  @media screen { body { background: #e5e7eb; padding: 12px; } .t { background: #fff; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,.25); } }
</style></head><body><div class="t">
  <div class="centro grande">${e(nombreNegocio)}</div>
  <div class="centro neg">CIERRE DE CAJA</div>
  <div class="centro">${e(caja.fecha)}</div>
  <hr>
  ${fila('Abrió', `${e(caja.abierta_por || '—')} ${hora(caja.hora_apertura)}`)}
  ${fila('Cerró', `${e(caja.cerrada_por || '—')} ${hora(caja.hora_cierre)}`)}
  <hr>
  <div class="neg">VENTAS DEL DÍA (${r?.ventas ?? 0})</div>
  ${medios}
  ${r?.sin_registrar?.ventas ? fila(`Sin registrar (${r.sin_registrar.ventas})`, pesos(r.sin_registrar.total)) : ''}
  ${fila('TOTAL VENTAS', pesos(r?.total_ventas), 'total')}
  <hr>
  <div class="neg">EFECTIVO</div>
  ${fila('Base inicial', pesos(caja.base))}
  ${fila('+ Ventas en efectivo', pesos(r?.por_medio.find(m => m.medio === 'Efectivo')?.valor ?? 0))}
  ${movimientos}
  ${fila('Efectivo esperado', pesos(caja.efectivo_esperado ?? r?.efectivo_esperado), 'neg')}
  ${conteo ? '<hr><div class="neg">CONTEO</div>' + conteo : ''}
  ${fila('Efectivo contado', pesos(caja.efectivo_contado), 'neg')}
  ${fila('DIFERENCIA', `${pesos(caja.diferencia)} · ${textoDiferencia(caja.diferencia)}`, 'total')}
  ${caja.observaciones ? `<hr><div>Obs.: ${e(caja.observaciones)}</div>` : ''}
  <div class="firma">Firma de quien cierra</div>
</div>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`;
}

export function imprimirCierre(caja: ICaja): boolean {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    return false;
  }
  ventana.document.open();
  ventana.document.write(cierreCajaHtml(caja));
  ventana.document.close();
  return true;
}
