"""
Cuadre de caja por día.

  1. abrir_caja      -> base de efectivo con la que arranca el día.
  2. ventas          -> cada venta guarda cómo se pagó (pago mixto permitido).
  3. movimientos     -> entradas/salidas de efectivo que no son ventas.
  4. cerrar_caja     -> se cuenta el efectivo (por billetes y monedas o el total)
                        y se compara con lo esperado:
                        efectivo esperado = base + ventas en efectivo + entradas - salidas
     Transferencias, Nequi/Daviplata y tarjeta no se cuentan: se listan para
     compararlas con la app del banco o el datáfono.
"""

import json
from datetime import date, datetime

from database import db
from models import Caja, MovimientoCaja, Venta
from queries.comunes import obtener_o_404, entero
from utils.errores import ErrorAPI

EFECTIVO = "Efectivo"
MEDIOS_PAGO = (EFECTIVO, "Nequi / Daviplata", "Transferencia bancaria", "Tarjeta")
SIN_REGISTRAR = "Sin registrar"

DENOMINACIONES = (100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50)

CATEGORIAS_MOVIMIENTO = {
    "entrada": ("Ingreso de sencillo", "Abono de cliente", "Otro ingreso"),
    "salida": ("Pago a proveedor", "Compra de insumos", "Retiro del dueño", "Gastos del local", "Otra salida"),
}


def _hoy():
    return date.today()


# ------------------------------------------------------------------
# Pagos de una venta
# ------------------------------------------------------------------

def leer_pagos(data, total):
    """
    Valida los pagos que llegan con una venta.
      "pagos": [ {"medio": "Efectivo", "valor": 20000}, {"medio": "Nequi / Daviplata", "valor": 14900} ]
      "recibido": 50000   (efectivo que entregó el cliente, para el cambio)
    Devuelve (medios, valores, recibido). Sin pagos -> ([], [], None) = "Sin registrar".
    """
    pagos = data.get("pagos")
    if not pagos:
        return [], [], None
    if not isinstance(pagos, list):
        raise ErrorAPI("Los pagos deben ser una lista de {medio, valor}")

    acumulado = {}
    for pago in pagos:
        medio = (pago.get("medio") or "").strip()
        if medio not in MEDIOS_PAGO:
            raise ErrorAPI(f"Medio de pago no válido: '{medio}'. Usa: {', '.join(MEDIOS_PAGO)}")
        valor = entero(pago.get("valor"), f"valor pagado con {medio}", 0)
        if valor:
            acumulado[medio] = acumulado.get(medio, 0) + valor

    suma = sum(acumulado.values())
    if suma != total:
        raise ErrorAPI(
            f"Los pagos suman ${suma:,} y el total de la venta es ${total:,}".replace(",", ".")
        )

    recibido = data.get("recibido")
    recibido = entero(recibido, "efectivo recibido", 0) if recibido not in (None, "") else None
    efectivo = acumulado.get(EFECTIVO, 0)
    if recibido is not None:
        if not efectivo:
            recibido = None
        elif recibido < efectivo:
            raise ErrorAPI(
                f"El efectivo recibido (${recibido:,}) es menor que lo que se paga en efectivo (${efectivo:,})"
                .replace(",", ".")
            )
    return list(acumulado.keys()), list(acumulado.values()), recibido


# ------------------------------------------------------------------
# Consultas
# ------------------------------------------------------------------

def caja_del_dia(dia=None):
    return Caja.query.filter(Caja.fecha == (dia or _hoy())).first()


def obtener_caja(codigo):
    return obtener_o_404(Caja, codigo, f"Caja {codigo} no encontrada")


def listar_cajas(limite=90):
    return Caja.query.order_by(Caja.fecha.desc()).limit(limite).all()


def validar_caja_abierta_para(fecha_venta):
    """Si la caja del día de la venta ya se cerró, no se puede vender ni anular en ese día."""
    dia = (fecha_venta or datetime.now()).date() if isinstance(fecha_venta, datetime) or fecha_venta is None else fecha_venta
    caja = caja_del_dia(dia)
    if caja is not None and caja.estado == "cerrada":
        raise ErrorAPI(
            f"La caja del {dia.isoformat()} ya está cerrada. Reábrela en Caja si necesitas cambiar sus ventas.",
            409,
        )
    return caja


def _ventas_del_dia(dia):
    inicio = datetime.combine(dia, datetime.min.time())
    fin = datetime.combine(dia, datetime.max.time())
    return Venta.query.filter(Venta.fecha >= inicio, Venta.fecha <= fin).order_by(Venta.fecha).all()


def resumen_caja(caja):
    """Ventas del día por medio de pago, movimientos y efectivo esperado."""
    ventas = _ventas_del_dia(caja.fecha)
    por_medio = {medio: 0 for medio in MEDIOS_PAGO}
    cantidad_por_medio = {medio: 0 for medio in MEDIOS_PAGO}
    sin_registrar = {"ventas": 0, "total": 0}
    no_efectivo = []          # para comparar con el banco / datáfono
    total = 0

    for venta in ventas:
        datos = venta.to_dict()
        total += datos["total"]
        if not datos["medios_pago"]:
            sin_registrar["ventas"] += 1
            sin_registrar["total"] += datos["total"]
            continue
        for medio, valor in zip(datos["medios_pago"], datos["valores_pago"]):
            por_medio[medio] = por_medio.get(medio, 0) + valor
            cantidad_por_medio[medio] = cantidad_por_medio.get(medio, 0) + 1
            if medio != EFECTIVO:
                no_efectivo.append({
                    "venta": venta.codigo, "hora": datos["fecha"], "medio": medio,
                    "valor": valor, "cliente": venta.cliente or "",
                })

    movimientos = MovimientoCaja.query.filter(MovimientoCaja.caja == caja.codigo).order_by(MovimientoCaja.fecha).all()
    entradas = sum(m.valor for m in movimientos if m.tipo == "entrada")
    salidas = sum(m.valor for m in movimientos if m.tipo == "salida")
    esperado = (caja.base or 0) + por_medio.get(EFECTIVO, 0) + entradas - salidas

    return {
        "ventas": len(ventas),
        "total_ventas": total,
        "por_medio": [
            {"medio": medio, "valor": por_medio.get(medio, 0), "pagos": cantidad_por_medio.get(medio, 0)}
            for medio in MEDIOS_PAGO
        ],
        "sin_registrar": sin_registrar,
        "no_efectivo": no_efectivo,
        "movimientos": [m.to_dict() for m in movimientos],
        "entradas": entradas,
        "salidas": salidas,
        "efectivo_esperado": esperado,
    }


def caja_con_resumen(caja):
    datos = caja.to_dict()
    datos["resumen_actual"] = resumen_caja(caja)
    return datos


# ------------------------------------------------------------------
# Abrir / movimientos / cerrar
# ------------------------------------------------------------------

def abrir_caja(data):
    """{ base: 100000, usuario: "...", fecha?: "2026-10-19" }"""
    dia = _hoy()
    if data.get("fecha"):
        try:
            dia = date.fromisoformat(str(data["fecha"])[:10])
        except ValueError:
            raise ErrorAPI("Fecha inválida (usa AAAA-MM-DD)")
    if caja_del_dia(dia) is not None:
        raise ErrorAPI(f"La caja del {dia.isoformat()} ya fue abierta", 409)

    caja = Caja(
        fecha=dia,
        base=entero(data.get("base") or 0, "base", 0),
        abierta_por=(data.get("usuario") or "").strip()[:100],
        hora_apertura=datetime.now().replace(microsecond=0),
        estado="abierta",
    )
    db.session.add(caja)
    db.session.flush()

    # Las ventas de ese día que ya existían quedan asociadas a esta caja
    for venta in _ventas_del_dia(dia):
        if venta.caja is None:
            venta.caja = caja.codigo

    db.session.commit()
    db.session.refresh(caja)
    return caja


def _caja_abierta(codigo):
    caja = obtener_caja(codigo)
    if caja.estado != "abierta":
        raise ErrorAPI("La caja ya está cerrada", 409)
    return caja


def agregar_movimiento(codigo, data):
    """{ tipo: 'entrada'|'salida', valor, motivo, categoria, usuario }"""
    caja = _caja_abierta(codigo)
    tipo = (data.get("tipo") or "").strip().lower()
    if tipo not in CATEGORIAS_MOVIMIENTO:
        raise ErrorAPI("El tipo debe ser 'entrada' o 'salida'")
    valor = entero(data.get("valor"), "valor", 1)
    motivo = (data.get("motivo") or "").strip()
    if not motivo:
        raise ErrorAPI("Escribe el motivo del movimiento")
    categoria = (data.get("categoria") or "").strip()
    if categoria and categoria not in CATEGORIAS_MOVIMIENTO[tipo]:
        raise ErrorAPI(f"Categoría no válida. Usa: {', '.join(CATEGORIAS_MOVIMIENTO[tipo])}")

    movimiento = MovimientoCaja(
        caja=caja.codigo, tipo=tipo, valor=valor, motivo=motivo[:300],
        categoria=categoria or None, usuario=(data.get("usuario") or "").strip()[:100],
        fecha=datetime.now().replace(microsecond=0),
    )
    db.session.add(movimiento)
    db.session.commit()
    db.session.refresh(movimiento)
    return movimiento


def eliminar_movimiento(codigo_movimiento):
    movimiento = obtener_o_404(MovimientoCaja, codigo_movimiento, "Movimiento no encontrado")
    _caja_abierta(movimiento.caja)
    db.session.delete(movimiento)
    db.session.commit()


def total_conteo(conteo):
    """{ "50000": 3, "20000": 5, ... } -> total en pesos (valida las denominaciones)."""
    if not isinstance(conteo, dict):
        raise ErrorAPI("El conteo debe indicar la cantidad de cada billete y moneda")
    total = 0
    limpio = {}
    for denominacion, cantidad in conteo.items():
        valor = entero(denominacion, "denominación", 1)
        if valor not in DENOMINACIONES:
            raise ErrorAPI(f"La denominación ${valor:,} no es válida".replace(",", "."))
        cantidad = entero(cantidad or 0, f"cantidad de ${valor:,}".replace(",", "."), 0)
        if cantidad:
            limpio[str(valor)] = cantidad
            total += valor * cantidad
    return total, limpio


def cerrar_caja(codigo, data):
    """
    Cierre con conteo por billetes y monedas:
        { "conteo": {"50000": 3, "20000": 5, "1000": 12}, "observaciones": "...", "usuario": "..." }
    o con el total ya contado:
        { "efectivo_contado": 245000, "observaciones": "...", "usuario": "..." }
    """
    caja = _caja_abierta(codigo)
    resumen = resumen_caja(caja)

    if data.get("conteo"):
        contado, conteo = total_conteo(data["conteo"])
    elif data.get("efectivo_contado") not in (None, ""):
        contado, conteo = entero(data["efectivo_contado"], "efectivo contado", 0), None
    else:
        raise ErrorAPI("Escribe el efectivo contado (por billetes y monedas o el total)")

    caja.efectivo_esperado = resumen["efectivo_esperado"]
    caja.efectivo_contado = contado
    caja.diferencia = contado - resumen["efectivo_esperado"]
    caja.conteo = json.dumps(conteo) if conteo else None
    caja.resumen = json.dumps(resumen, ensure_ascii=False)
    caja.observaciones = (data.get("observaciones") or "").strip()
    caja.cerrada_por = (data.get("usuario") or "").strip()[:100]
    caja.hora_cierre = datetime.now().replace(microsecond=0)
    caja.estado = "cerrada"
    db.session.commit()
    db.session.refresh(caja)
    return caja


def reabrir_caja(codigo, data):
    """Para corregir un cierre: la caja vuelve a quedar abierta (se borra el conteo)."""
    caja = obtener_caja(codigo)
    if caja.estado != "cerrada":
        raise ErrorAPI("La caja ya está abierta", 409)
    motivo = (data.get("motivo") or "").strip()
    if not motivo:
        raise ErrorAPI("Escribe por qué se reabre la caja")
    anterior = (
        f"Reabierta el {datetime.now():%Y-%m-%d %H:%M} ({motivo}). "
        f"Cierre anterior: contado ${caja.efectivo_contado or 0:,}, diferencia ${caja.diferencia or 0:,}"
    ).replace(",", ".")
    caja.observaciones = (caja.observaciones + " · " if caja.observaciones else "") + anterior
    caja.estado = "abierta"
    caja.efectivo_esperado = caja.efectivo_contado = caja.diferencia = None
    caja.conteo = caja.resumen = None
    caja.cerrada_por = None
    caja.hora_cierre = None
    db.session.commit()
    db.session.refresh(caja)
    return caja


def opciones_caja():
    return {
        "medios_pago": list(MEDIOS_PAGO),
        "denominaciones": list(DENOMINACIONES),
        "categorias": {tipo: list(lista) for tipo, lista in CATEGORIAS_MOVIMIENTO.items()},
    }
