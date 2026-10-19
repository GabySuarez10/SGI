"""
Ventas / salidas desde el LOCAL.

Registrar una venta:
  1. Verifica y descuenta las existencias de Inventario_local.
  2. Calcula el total = suma(cantidad[i] * precio_unitario[i]).
  3. Guarda la venta con las listas producto, cantidad y precio_unitario.
"""

from database import db
from models import Venta, Producto, Factura
from queries.comunes import (
    obtener_o_404, validar_listas_mismo_largo, validar_sin_repetidos, entero,
)
from queries.inventario_queries import fila_local
from utils.errores import ErrorAPI, NoEncontrado
from utils.fechas import a_fecha
from utils.listas import lista_textos, lista_numeros, lista_a_texto
from utils.precios import MODALIDADES, normalizar_modalidad, precio_por_modalidad
from queries import kit_queries, caja_queries
from queries.configuracion_queries import valores as valores_configuracion, mapa_tarifas_kit, kit_de_producto


def listar_ventas():
    return Venta.query.order_by(Venta.fecha.desc(), Venta.codigo.desc()).all()


def obtener_venta(codigo):
    return obtener_o_404(Venta, codigo, "Venta no encontrada")


def crear_venta(data):
    """
    Body:
    { "producto": ["Lapiz HB", "Borrador blanco"],
      "cantidad": [10, 4],
      "precio_unitario": [800, 700],      # opcional: si no llega, se calcula por modalidad
      "modalidad": "Detal",               # Detal | Pintar en el local | Kit para llevar |
                                          # Pintada | Por mayor (local) | Empresa por mayor |
                                          # Empresa con contrato
      "cliente": "Cliente mostrador",
      "observacion": "...", "usuario": "cajero_demo", "fecha": "2026-10-07" }
    """
    cliente = (data.get("cliente") or "").strip()
    if not cliente:
        raise ErrorAPI("Ingresa el cliente o destino de la venta")

    # No se puede vender en un día cuya caja ya se cerró
    fecha = a_fecha(data.get("fecha"))
    caja = caja_queries.validar_caja_abierta_para(fecha)

    modalidad = normalizar_modalidad(data.get("modalidad"))
    if modalidad not in MODALIDADES:
        raise ErrorAPI(f"Modalidad no válida. Usa una de: {', '.join(MODALIDADES)}")
    config = valores_configuracion()
    tarifas_kit = mapa_tarifas_kit()

    nombres = lista_textos(data.get("producto"))
    cantidades = lista_numeros(data.get("cantidad"))
    precios = lista_numeros(data.get("precio_unitario"))

    if not nombres:
        raise ErrorAPI("Selecciona al menos un producto")
    if not precios:
        precios = [None] * len(nombres)
    validar_listas_mismo_largo(producto=nombres, cantidad=cantidades, precio_unitario=precios)
    validar_sin_repetidos(nombres)

    nombres_guardados, precios_guardados, total = [], [], 0
    kits = 0   # figuras vendidas en modalidad de kit (cada una lleva 5 pinturas + 1 pincel)
    for nombre, cantidad, precio in zip(nombres, cantidades, precios):
        cantidad = entero(cantidad, f"cantidad de '{nombre}'", 1)

        local = fila_local(nombre)
        if local is None:
            raise NoEncontrado(f"'{nombre}' no está registrado en el local")
        if (local.existencias or 0) < cantidad:
            raise ErrorAPI(
                f"Stock insuficiente en el local para '{local.nombre}': "
                f"hay {local.existencias or 0}, se intentan vender {cantidad}"
            )

        producto = db.session.get(Producto, local.codigo)
        es_figura = (producto.tipo if producto else "figura") in (None, "", "figura")
        if es_figura:
            kits += cantidad
        if precio is None:
            precio = precio_por_modalidad(
                modalidad, local.precio_venta, local.precio_mayorista, config, es_figura,
                producto.precio_pintar_local if producto else None,
                producto.precio_terminada if producto else None,
                kit_de_producto(producto, tarifas_kit, config) if producto else None,
            )
        else:
            precio = entero(precio, "precio_unitario", 0)
        local.existencias -= cantidad
        total += cantidad * precio
        nombres_guardados.append(local.nombre)
        precios_guardados.append(precio)

    # Pinturas y pinceles de los kits: del local (kit para llevar) o de la bodega (contrato)
    usados = kit_queries.descontar(modalidad, kits, config)
    observacion = (data.get("observacion") or "").strip()
    if usados:
        detalle = ", ".join(f"{unidades} {nombre.lower()}" for nombre, unidades in usados.items())
        lugar = "local" if kit_queries.lugar_de_kits(modalidad) == "local" else "bodega"
        observacion = (observacion + " · " if observacion else "") + f"Kits: {detalle} ({lugar})"

    # Cómo pagó el cliente (pago mixto permitido; deben sumar el total)
    medios, valores, recibido = caja_queries.leer_pagos(data, total)

    venta = Venta(
        producto=lista_a_texto(nombres_guardados),
        cantidad=lista_a_texto(cantidades),
        precio_unitario=lista_a_texto(precios_guardados),
        total=total,
        cliente=cliente,
        observacion=observacion,
        usuario=data.get("usuario") or "",
        modalidad=modalidad,
        medios_pago=lista_a_texto(medios) if medios else None,
        valores_pago=lista_a_texto(valores) if valores else None,
        recibido=recibido,
        caja=caja.codigo if caja else None,
    )
    if fecha:
        venta.fecha = fecha

    db.session.add(venta)
    db.session.commit()
    db.session.refresh(venta)
    return venta


def eliminar_venta(codigo):
    """Anula una venta: devuelve las unidades al inventario del local."""
    venta = obtener_venta(codigo)
    caja_queries.validar_caja_abierta_para(venta.fecha)
    activa = Factura.query.filter(Factura.venta == venta.codigo, Factura.estado != "anulada").first()
    if activa is not None:
        raise ErrorAPI(
            f"La venta tiene la {'tirilla' if activa.tipo == 'pos' else 'factura electrónica'} "
            f"{activa.numero_completo}. Anúlala primero en Facturas.",
            409,
        )
    datos = venta.to_dict()
    kits = 0
    for nombre, cantidad in zip(datos["producto"], datos["cantidad"]):
        local = fila_local(nombre, crear=True)
        local.existencias = (local.existencias or 0) + cantidad
        producto = db.session.get(Producto, local.codigo)
        if producto is None or (producto.tipo or "figura") == "figura":
            kits += cantidad
    # Devuelve las pinturas y pinceles de los kits al lugar de donde salieron
    kit_queries.devolver(venta.modalidad, kits, valores_configuracion())
    db.session.delete(venta)
    db.session.commit()
