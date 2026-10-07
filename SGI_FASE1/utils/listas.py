"""
Utilidades para manejar las columnas que guardan LISTAS como texto.

En la base de datos, las tablas Venta, Pedido_proveedor y Traslado guardan
varios productos en una misma fila, separados por comas. Ejemplo:

    Producto        = 'Cuaderno cuadriculado, Lapiz HB'
    Cantidad        = '5, 10'
    Precio_unitario = '4500, 800'

La posición indica a qué producto pertenece cada valor:
    Cuaderno cuadriculado -> 5 unidades a 4500
    Lapiz HB              -> 10 unidades a 800

Estas funciones convierten ese texto en listas de Python (para responder
JSON con arreglos) y vuelven a convertir las listas en texto (para guardar).
"""

SEPARADOR = ","


def texto_a_lista(texto):
    """'Cuaderno, Lapiz HB' -> ['Cuaderno', 'Lapiz HB']"""
    if texto is None or str(texto).strip() == "":
        return []
    return [parte.strip() for parte in str(texto).split(SEPARADOR)]


def texto_a_lista_numeros(texto):
    """'5, 10' -> [5, 10]   (los valores vacíos se toman como 0)"""
    numeros = []
    for parte in texto_a_lista(texto):
        try:
            numeros.append(int(float(parte)) if parte else 0)
        except ValueError:
            numeros.append(0)
    return numeros


def lista_a_texto(valor):
    """
    ['Cuaderno', 'Lapiz HB'] -> 'Cuaderno, Lapiz HB'
    [5, 10]                   -> '5, 10'

    Si ya llega como texto (por ejemplo '5, 10') se devuelve normalizado,
    así la API acepta tanto arreglos JSON como texto separado por comas.
    """
    if valor is None:
        return None
    if isinstance(valor, str):
        valor = texto_a_lista(valor)
    return (SEPARADOR + " ").join(str(v).strip() for v in valor)


def lista_numeros(valor):
    """Acepta [5, '10'] o '5, 10' y devuelve siempre [5, 10]."""
    if valor is None:
        return []
    if isinstance(valor, str):
        return texto_a_lista_numeros(valor)
    return texto_a_lista_numeros(lista_a_texto(valor))


def lista_textos(valor):
    """Acepta ['A', 'B'] o 'A, B' y devuelve siempre ['A', 'B']."""
    if valor is None:
        return []
    if isinstance(valor, str):
        return texto_a_lista(valor)
    return [str(v).strip() for v in valor]
