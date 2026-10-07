from datetime import datetime, date

from utils.errores import ErrorAPI


def a_fecha(valor, campo="fecha"):
    """
    Convierte el texto que llega del front en datetime.

    Acepta '2026-10-07' (input type="date") o '2026-10-07T08:30:00'.
    Si solo llega la fecha, se completa con la hora actual.
    """
    if valor in (None, ""):
        return None
    if isinstance(valor, datetime):
        return valor
    try:
        texto = str(valor).replace("Z", "")
        if len(texto) == 10:
            dia = date.fromisoformat(texto)
            return datetime.combine(dia, datetime.now().time()).replace(microsecond=0)
        return datetime.fromisoformat(texto)
    except ValueError:
        raise ErrorAPI(f"Formato de {campo} inválido. Use AAAA-MM-DD o AAAA-MM-DDTHH:MM:SS")


def a_texto(valor):
    """datetime -> '2026-10-07T08:30:00' (o None)."""
    return valor.isoformat() if valor else None
