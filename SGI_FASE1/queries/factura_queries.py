"""
Facturación (bases según la norma colombiana).

Dos documentos:
  * 'pos'         -> Documento equivalente electrónico tiquete de máquina
                     registradora con sistema P.O.S. (tirilla). Si el cliente
                     no se identifica se registra como consumidor final
                     (222222222222).
  * 'electronica' -> Factura electrónica de venta. Exige identificar al
                     adquirente (nombre, documento y correo).

Contenido que se guarda/imprime (Estatuto Tributario art. 617 y Resolución
DIAN 000165 de 2023): denominación del documento; nombre/razón social y NIT
del emisor; adquirente; numeración consecutiva autorizada (resolución,
prefijo, rango y vigencia); fecha y hora; cantidad, descripción y código de
cada artículo; valor total; forma y medio de pago; IVA discriminado (si es
responsable); calidades tributarias; software. El CUFE/CUDE, la firma
digital y el envío a la DIAN los hace un proveedor tecnológico: aquí queda el
documento listo y en estado 'pendiente_envio', y luego se registra el
CUFE/CUDE con registrar_validacion().
"""

import json
from datetime import date, datetime, timedelta

from sqlalchemy.exc import IntegrityError

from database import db
from models import DatosFacturacion, Factura, Venta, Producto
from queries.comunes import obtener_o_404, buscar_por_nombre, entero
from utils.errores import ErrorAPI

TIPOS = ("pos", "electronica")
NOMBRE_TIPO = {
    "pos": "Documento equivalente electrónico tiquete de máquina registradora con sistema P.O.S.",
    "electronica": "Factura electrónica de venta",
}
ESTADOS = ("pendiente_envio", "aceptada", "rechazada", "anulada")
TIPOS_DOCUMENTO = ("CC", "NIT", "CE", "TI", "PP", "PEP", "PPT", "NIT_EXT", "RC", "DIE")
FORMAS_PAGO = ("Contado", "Crédito")
MEDIOS_PAGO = ("Efectivo", "Tarjeta débito", "Tarjeta crédito", "Transferencia", "Nequi", "Daviplata", "Otro")

# Consumidor final (Resolución 000165 de 2023)
CONSUMIDOR_FINAL = {"tipo_documento": "CC", "documento": "222222222222", "nombre": "Consumidor final"}

# Datos de facturación con su valor por defecto
CAMPOS = {
    # Emisor
    "razon_social": "",
    "nombre_comercial": "Pintarte",
    "tipo_persona": "natural",            # natural | juridica
    "nit": "",
    "dv": "",
    "direccion": "",
    "ciudad": "",
    "departamento": "",
    "telefono": "",
    "correo": "",
    "actividad_economica": "",            # código CIIU
    # Calidades tributarias
    "responsable_iva": "no",              # si | no
    "tarifa_iva": "19",
    "precios_incluyen_iva": "si",         # los precios del sistema ya traen el IVA
    "regimen_simple": "no",
    "gran_contribuyente": "no",
    "autorretenedor": "no",
    "agente_retencion_iva": "no",
    # Numeración DIAN del documento POS
    "pos_resolucion": "",
    "pos_fecha_resolucion": "",
    "pos_prefijo": "",
    "pos_desde": "1",
    "pos_hasta": "",
    "pos_vigencia_hasta": "",
    "pos_caja": "Caja 1",
    # Numeración DIAN de la factura electrónica
    "fe_resolucion": "",
    "fe_fecha_resolucion": "",
    "fe_prefijo": "",
    "fe_desde": "1",
    "fe_hasta": "",
    "fe_vigencia_hasta": "",
    # Software / proveedor tecnológico
    "software_nombre": "SGI Pintarte",
    "software_fabricante": "",
    "software_nit": "",
    "proveedor_tecnologico": "",
    # Impresión
    "ancho_tirilla": "80",                # 80 | 58 (mm)
    "mensaje_pie": "¡Gracias por su compra!",
    "politica_cambios": "",
}


# ------------------------------------------------------------------
# Datos del negocio
# ------------------------------------------------------------------

def datos_facturacion():
    """Todos los datos con sus valores por defecto si aún no se han guardado."""
    datos = dict(CAMPOS)
    for fila in DatosFacturacion.query.all():
        if fila.clave in datos:
            datos[fila.clave] = fila.valor if fila.valor is not None else ""
    return datos


def guardar_datos_facturacion(data):
    if not isinstance(data, dict):
        raise ErrorAPI("Envía los datos de facturación como objeto")
    for clave, valor in data.items():
        if clave not in CAMPOS:
            continue
        texto = "" if valor is None else str(valor).strip()
        if clave in ("pos_desde", "pos_hasta", "fe_desde", "fe_hasta") and texto:
            entero(texto, clave, 1)
        if clave == "tarifa_iva" and texto:
            entero(texto, "tarifa de IVA", 0)
        for fecha in ("pos_fecha_resolucion", "pos_vigencia_hasta", "fe_fecha_resolucion", "fe_vigencia_hasta"):
            if clave == fecha and texto:
                try:
                    date.fromisoformat(texto)
                except ValueError:
                    raise ErrorAPI(f"La fecha '{texto}' no es válida (usa AAAA-MM-DD)")
        fila = db.session.get(DatosFacturacion, clave) or DatosFacturacion(clave=clave)
        fila.valor = texto[:500]
        db.session.add(fila)
    db.session.commit()
    return datos_facturacion()


def _si(valor):
    return str(valor or "").strip().lower() in ("si", "sí", "true", "1")


def _resolucion(datos, tipo):
    """Datos de la numeración autorizada y si está completa."""
    p = "pos" if tipo == "pos" else "fe"
    resolucion = {
        "numero": datos[f"{p}_resolucion"],
        "fecha": datos[f"{p}_fecha_resolucion"],
        "prefijo": datos[f"{p}_prefijo"],
        "desde": int(datos[f"{p}_desde"] or 1),
        "hasta": int(datos[f"{p}_hasta"]) if datos[f"{p}_hasta"] else None,
        "vigencia_hasta": datos[f"{p}_vigencia_hasta"],
    }
    resolucion["completa"] = bool(
        resolucion["numero"] and resolucion["fecha"] and resolucion["hasta"] and resolucion["vigencia_hasta"]
    )
    return resolucion


def _foto_emisor(datos, tipo, resolucion):
    """Copia de los datos del emisor que se guarda dentro de la factura."""
    calidades = []
    if not _si(datos["responsable_iva"]):
        calidades.append("No responsable de IVA")
    if _si(datos["regimen_simple"]):
        calidades.append("Régimen Simple de Tributación")
    if _si(datos["gran_contribuyente"]):
        calidades.append("Gran contribuyente")
    if _si(datos["autorretenedor"]):
        calidades.append("Autorretenedor de renta")
    if _si(datos["agente_retencion_iva"]):
        calidades.append("Agente de retención de IVA")
    return {
        "denominacion": NOMBRE_TIPO[tipo],
        "razon_social": datos["razon_social"],
        "nombre_comercial": datos["nombre_comercial"],
        "tipo_persona": datos["tipo_persona"],
        "nit": datos["nit"],
        "dv": datos["dv"],
        "direccion": datos["direccion"],
        "ciudad": datos["ciudad"],
        "departamento": datos["departamento"],
        "telefono": datos["telefono"],
        "correo": datos["correo"],
        "actividad_economica": datos["actividad_economica"],
        "responsable_iva": _si(datos["responsable_iva"]),
        "calidades": calidades,
        "resolucion": resolucion,
        "caja": datos["pos_caja"] if tipo == "pos" else "",
        "software": {
            "nombre": datos["software_nombre"],
            "fabricante": datos["software_fabricante"],
            "nit": datos["software_nit"],
            "proveedor_tecnologico": datos["proveedor_tecnologico"],
        },
        "ancho_tirilla": datos["ancho_tirilla"],
        "mensaje_pie": datos["mensaje_pie"],
        "politica_cambios": datos["politica_cambios"],
    }


# ------------------------------------------------------------------
# Consultas
# ------------------------------------------------------------------

def listar_facturas(tipo=None, estado=None):
    consulta = Factura.query
    if tipo:
        consulta = consulta.filter(Factura.tipo == tipo)
    if estado:
        consulta = consulta.filter(Factura.estado == estado)
    return consulta.order_by(Factura.fecha.desc(), Factura.codigo.desc()).all()


def obtener_factura(codigo):
    return obtener_o_404(Factura, codigo, f"Factura {codigo} no encontrada")


def facturas_de_venta(venta):
    return Factura.query.filter(Factura.venta == venta).order_by(Factura.codigo).all()


def ventas_sin_factura(limite=100):
    """Ventas que aún no tienen ninguna factura activa (para facturarlas)."""
    facturadas = db.session.query(Factura.venta).filter(
        Factura.venta.isnot(None), Factura.estado != "anulada"
    )
    return (
        Venta.query.filter(~Venta.codigo.in_(facturadas))
        .order_by(Venta.fecha.desc(), Venta.codigo.desc())
        .limit(limite)
        .all()
    )


# ------------------------------------------------------------------
# Emitir
# ------------------------------------------------------------------

def _detalle_venta(venta, iva_activo, tarifa, incluye_iva):
    """Líneas de la factura con su base, IVA y total (en pesos enteros)."""
    datos = venta.to_dict()
    lineas = []
    for nombre, cantidad, precio in zip(datos["producto"], datos["cantidad"], datos["precio_unitario"]):
        producto = buscar_por_nombre(Producto, nombre)
        es_figura = producto is None or (producto.tipo or "figura") == "figura"
        descripcion = nombre
        if es_figura and venta.modalidad and venta.modalidad != "Detal":
            descripcion = f"{nombre} ({venta.modalidad})"

        valor = int(cantidad) * int(precio)
        if iva_activo and tarifa:
            if incluye_iva:
                base = round(valor / (1 + tarifa / 100))
                iva = valor - base
                total = valor
            else:
                base = valor
                iva = round(valor * tarifa / 100)
                total = base + iva
        else:
            base, iva, total = valor, 0, valor

        lineas.append({
            "codigo": (producto.referencia if producto and producto.referencia else str(producto.codigo if producto else "")),
            "descripcion": descripcion,
            "cantidad": int(cantidad),
            "unidad": "UND",
            "valor_unitario": int(precio),
            "base": base,
            "tarifa_iva": tarifa if iva_activo else 0,
            "iva": iva,
            "total": total,
        })
    return lineas


def _cliente(data, tipo):
    cliente = data.get("cliente") or {}
    tipo_documento = (cliente.get("tipo_documento") or "").strip().upper()
    documento = (cliente.get("documento") or "").strip()
    nombre = (cliente.get("nombre") or "").strip()
    correo = (cliente.get("correo") or "").strip()

    if tipo == "pos" and not documento:
        return {**CONSUMIDOR_FINAL, "correo": correo, "direccion": "", "telefono": ""}

    if tipo == "electronica":
        faltan = [campo for campo, valor in (
            ("tipo de documento", tipo_documento), ("número de documento", documento),
            ("nombre o razón social", nombre), ("correo", correo),
        ) if not valor]
        if faltan:
            raise ErrorAPI("Para la factura electrónica falta: " + ", ".join(faltan))
        if documento == CONSUMIDOR_FINAL["documento"]:
            raise ErrorAPI("La factura electrónica no se puede emitir a consumidor final: identifica al cliente")
    if tipo_documento and tipo_documento not in TIPOS_DOCUMENTO:
        raise ErrorAPI(f"Tipo de documento no válido. Usa uno de: {', '.join(TIPOS_DOCUMENTO)}")
    if correo and "@" not in correo:
        raise ErrorAPI(f"El correo '{correo}' no es válido")
    if not nombre:
        raise ErrorAPI("Escribe el nombre o razón social del cliente")

    return {
        "tipo_documento": tipo_documento or "CC",
        "documento": documento[:30],
        "nombre": nombre,
        "correo": correo,
        "direccion": (cliente.get("direccion") or "").strip(),
        "telefono": (cliente.get("telefono") or "").strip()[:40],
    }


def _siguiente_numero(tipo, resolucion):
    prefijo = resolucion["prefijo"] or ""
    ultimo = db.session.query(db.func.max(Factura.numero)).filter(
        Factura.tipo == tipo, Factura.prefijo == prefijo
    ).scalar()
    numero = max(resolucion["desde"], (ultimo or 0) + 1)
    if resolucion["hasta"] and numero > resolucion["hasta"]:
        raise ErrorAPI(
            f"Se agotó el rango autorizado por la DIAN ({prefijo}{resolucion['desde']} a "
            f"{prefijo}{resolucion['hasta']}). Solicita una nueva resolución y regístrala en Configuración.",
            409,
        )
    return prefijo, numero


def crear_factura(data):
    """
    Body:
    { "venta": 12,
      "tipo": "pos" | "electronica",
      "cliente": { "tipo_documento": "CC", "documento": "1020...", "nombre": "...",
                   "correo": "...", "direccion": "...", "telefono": "..." },   (POS: opcional)
      "forma_pago": "Contado" | "Crédito",
      "dias_credito": 30,                     (solo crédito)
      "medio_pago": "Efectivo" | "Tarjeta débito" | ...,
      "recibido": 50000,                      (efectivo: para calcular el cambio)
      "observaciones": "...", "usuario": "..." }
    """
    tipo = (data.get("tipo") or "pos").strip().lower()
    if tipo not in TIPOS:
        raise ErrorAPI("El tipo debe ser 'pos' (tirilla) o 'electronica'")

    codigo_venta = entero(data.get("venta"), "venta", 1)
    venta = obtener_o_404(Venta, codigo_venta, f"Venta {codigo_venta} no encontrada")

    activas = [f for f in facturas_de_venta(venta.codigo) if f.estado != "anulada"]
    if any(f.tipo == tipo for f in activas):
        existente = next(f for f in activas if f.tipo == tipo)
        raise ErrorAPI(
            f"La venta {venta.codigo} ya tiene {'tirilla' if tipo == 'pos' else 'factura electrónica'} "
            f"{existente.numero_completo}",
            409,
        )

    datos = datos_facturacion()
    resolucion = _resolucion(datos, tipo)
    if resolucion["vigencia_hasta"]:
        try:
            if date.fromisoformat(resolucion["vigencia_hasta"]) < date.today():
                raise ErrorAPI("La resolución de numeración DIAN está vencida. Registra la nueva en Configuración.", 409)
        except ValueError:
            pass

    forma_pago = data.get("forma_pago") or "Contado"
    if forma_pago not in FORMAS_PAGO:
        raise ErrorAPI(f"Forma de pago no válida. Usa: {', '.join(FORMAS_PAGO)}")
    medio_pago = data.get("medio_pago") or "Efectivo"
    if medio_pago not in MEDIOS_PAGO:
        raise ErrorAPI(f"Medio de pago no válido. Usa: {', '.join(MEDIOS_PAGO)}")

    cliente = _cliente(data, tipo)
    if forma_pago == "Crédito" and cliente["documento"] == CONSUMIDOR_FINAL["documento"]:
        raise ErrorAPI("Una venta a crédito debe identificar al cliente")

    iva_activo = _si(datos["responsable_iva"])
    tarifa = int(datos["tarifa_iva"] or 0)
    lineas = _detalle_venta(venta, iva_activo, tarifa, _si(datos["precios_incluyen_iva"]))
    total = sum(linea["total"] for linea in lineas)

    recibido = data.get("recibido")
    recibido = entero(recibido, "valor recibido", 0) if recibido not in (None, "") else None
    if recibido is not None and medio_pago == "Efectivo" and recibido < total:
        raise ErrorAPI(f"El valor recibido (${recibido:,}) es menor que el total (${total:,})".replace(",", "."))

    fecha_vencimiento = None
    if forma_pago == "Crédito":
        dias = entero(data.get("dias_credito") or 30, "días de crédito", 1)
        fecha_vencimiento = date.today() + timedelta(days=dias)

    emisor = _foto_emisor(datos, tipo, resolucion)

    # Número consecutivo (si dos cajas facturan a la vez, se reintenta)
    for intento in range(3):
        prefijo, numero = _siguiente_numero(tipo, resolucion)
        factura = Factura(
            venta=venta.codigo, tipo=tipo, prefijo=prefijo, numero=numero,
            fecha=datetime.now().replace(microsecond=0), fecha_vencimiento=fecha_vencimiento,
            cliente_tipo_documento=cliente["tipo_documento"], cliente_documento=cliente["documento"],
            cliente_nombre=cliente["nombre"], cliente_correo=cliente["correo"],
            cliente_direccion=cliente["direccion"], cliente_telefono=cliente["telefono"],
            forma_pago=forma_pago, medio_pago=medio_pago, recibido=recibido,
            subtotal=sum(linea["base"] for linea in lineas), descuento=0,
            iva=sum(linea["iva"] for linea in lineas), total=total,
            detalle=json.dumps(lineas, ensure_ascii=False), emisor=json.dumps(emisor, ensure_ascii=False),
            estado="pendiente_envio",
            observaciones=(data.get("observaciones") or "").strip(),
            usuario=(data.get("usuario") or "").strip()[:100],
        )
        db.session.add(factura)
        try:
            db.session.flush()
            break
        except IntegrityError:
            db.session.rollback()
            if intento == 2:
                raise ErrorAPI("No se pudo asignar el número de factura. Intenta de nuevo.", 409)

    # Si el cliente pide factura electrónica, la tirilla de esa venta queda reemplazada
    if tipo == "electronica":
        for anterior in activas:
            if anterior.tipo == "pos":
                anterior.estado = "anulada"
                anterior.observaciones = (
                    (anterior.observaciones + " · " if anterior.observaciones else "")
                    + f"Reemplazada por la factura electrónica {factura.numero_completo}"
                )

    db.session.commit()
    db.session.refresh(factura)
    return factura


# ------------------------------------------------------------------
# Después de emitir
# ------------------------------------------------------------------

def registrar_validacion(codigo, data):
    """
    Registra lo que responde la DIAN (por medio del proveedor tecnológico):
    { "cufe": "...", "estado": "aceptada" | "rechazada" | "pendiente_envio" }
    """
    factura = obtener_factura(codigo)
    if factura.estado == "anulada":
        raise ErrorAPI("La factura está anulada", 409)
    if "cufe" in data:
        factura.cufe = (data.get("cufe") or "").strip()[:120] or None
    if "estado" in data:
        estado = (data.get("estado") or "").strip()
        if estado not in ESTADOS or estado == "anulada":
            raise ErrorAPI("Estado no válido: usa pendiente_envio, aceptada o rechazada")
        factura.estado = estado
    db.session.commit()
    db.session.refresh(factura)
    return factura


def anular_factura(codigo, data):
    """
    Marca la factura como anulada en el sistema. Ojo: ante la DIAN una factura
    electrónica ya validada se anula con una NOTA CRÉDITO del proveedor tecnológico.
    """
    factura = obtener_factura(codigo)
    if factura.estado == "anulada":
        raise ErrorAPI("La factura ya está anulada", 409)
    motivo = (data.get("motivo") or "").strip()
    if not motivo:
        raise ErrorAPI("Escribe el motivo de la anulación")
    factura.estado = "anulada"
    factura.observaciones = (factura.observaciones + " · " if factura.observaciones else "") + f"Anulada: {motivo}"
    db.session.commit()
    db.session.refresh(factura)
    return factura


def opciones_facturacion():
    return {
        "tipos": [{"valor": t, "nombre": NOMBRE_TIPO[t]} for t in TIPOS],
        "tipos_documento": list(TIPOS_DOCUMENTO),
        "formas_pago": list(FORMAS_PAGO),
        "medios_pago": list(MEDIOS_PAGO),
        "consumidor_final": CONSUMIDOR_FINAL,
    }
