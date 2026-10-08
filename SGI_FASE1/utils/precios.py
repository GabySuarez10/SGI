"""
Fórmulas de precio de Pintarte.

    precio crudo     = costo de fábrica × multiplicador_crudo (4)  + envío
    precio por mayor = (costo de fábrica × 4) ÷ divisor_mayor (2)  + envío

Ejemplo: Oso navidad, fábrica 2000, sin envío -> crudo 8000, por mayor 4000.
"""

# Modalidades de venta y qué precio usa cada una
DETAL = "Detal"                              # figura en crudo (yeso blanco)
PINTAR_LOCAL = "Pintar en el local"          # crudo + pinturas y técnica en el local
KIT_LLEVAR = "Kit para llevar"               # crudo + 5 pinturas + 1 pincel para la casa
PINTADA = "Pintada"                          # crudo + valor adicional (se escribe en la venta)
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


def precio_por_modalidad(modalidad, precio_venta, precio_mayorista, config, es_figura=True):
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
    if modalidad == PINTAR_LOCAL:
        return crudo + int(config.get("valor_pintar_local", 0))
    if modalidad == PINTADA:
        return crudo + int(config.get("valor_pintada", 0))
    if modalidad == EMPRESA_CONTRATO:
        return int(config.get("precio_kit_contrato", 0))
    return crudo
