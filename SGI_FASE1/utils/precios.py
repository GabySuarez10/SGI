"""
Fórmulas de precio de Pintarte.

    precio crudo     = costo de fábrica × multiplicador_crudo (4)  + envío
    precio por mayor = (costo de fábrica × 4) ÷ divisor_mayor (2)  + envío
    pintar en el local = precio crudo × 2          (sugerido, editable)
    figura terminada   = pintar en el local × 2    (sugerido, editable)

Ejemplo: Oso navidad, fábrica 2000, sin envío -> crudo 8000, por mayor 4000,
pintar en el local 16000, terminada 32000.
"""

FACTOR_PINTAR_LOCAL = 2   # pintar en el local = crudo × 2
FACTOR_TERMINADA = 2      # terminada = pintar en el local × 2

# Modalidades de venta y qué precio usa cada una
DETAL = "Detal"                              # figura en crudo (yeso blanco)
PINTAR_LOCAL = "Pintar en el local"          # precio "pintar en el local" del producto
KIT_LLEVAR = "Kit para llevar"               # crudo + 5 pinturas + 1 pincel para la casa
PINTADA = "Pintada"                          # precio "figura terminada" del producto
MAYOR_LOCAL = "Por mayor (local)"
EMPRESA_MAYOR = "Empresa por mayor"
EMPRESA_CONTRATO = "Empresa con contrato"    # precio general del kit por contrato

MODALIDADES = (
    DETAL, PINTAR_LOCAL, KIT_LLEVAR, PINTADA,
    MAYOR_LOCAL, EMPRESA_MAYOR, EMPRESA_CONTRATO,
)
# Modalidades que entregan kit (5 pinturas + 1 pincel por figura)
MODALIDADES_KIT = (KIT_LLEVAR, EMPRESA_CONTRATO)

# Nombres anteriores que se siguen aceptando
ALIAS = {"Kit (local)": KIT_LLEVAR}


def normalizar_modalidad(modalidad):
    modalidad = (modalidad or DETAL).strip()
    return ALIAS.get(modalidad, modalidad)


def calcular_precios(costo, envio=0, multiplicador=4, divisor=2):
    """Devuelve (precio_crudo_total, precio_mayor_total) ya con el envío sumado."""
    costo = int(costo or 0)
    envio = int(envio or 0)
    divisor = divisor or 1
    crudo = costo * int(multiplicador or 0)
    mayor = round(crudo / divisor)
    return crudo + envio, mayor + envio


def precios_pintura(precio_crudo, pintar_guardado=None, terminada_guardado=None):
    """
    (pintar en el local, terminada) de una figura.
    Si el valor guardado es NULL se usa el sugerido:
        pintar en el local = crudo × 2,  terminada = pintar en el local × 2
    """
    pintar = int(pintar_guardado) if pintar_guardado is not None else int(precio_crudo or 0) * FACTOR_PINTAR_LOCAL
    terminada = int(terminada_guardado) if terminada_guardado is not None else pintar * FACTOR_TERMINADA
    return pintar, terminada


def precio_por_modalidad(modalidad, precio_venta, precio_mayorista, config, es_figura=True,
                         precio_pintar_local=None, precio_terminada=None):
    """
    Precio unitario sugerido según la modalidad de la venta.
    Pinturas, pinceles y otros materiales (es_figura=False) se venden a su precio
    de detal, o al precio por mayor en las modalidades de por mayor; no llevan
    recargo de kit, de pintar en el local ni de pintada.
    """
    crudo = int(precio_venta or 0)
    if modalidad in (MAYOR_LOCAL, EMPRESA_MAYOR):
        return int(precio_mayorista or 0)
    if not es_figura:
        return crudo
    if modalidad == KIT_LLEVAR:
        return crudo + int(config.get("valor_kit_local", 0))
    pintar, terminada = precios_pintura(crudo, precio_pintar_local, precio_terminada)
    if modalidad == PINTAR_LOCAL:
        return pintar
    if modalidad == PINTADA:
        return terminada
    if modalidad == EMPRESA_CONTRATO:
        return int(config.get("precio_kit_contrato", 0))
    return crudo
