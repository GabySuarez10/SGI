class ErrorAPI(Exception):
    """
    Error controlado de la API.

    Las consultas (carpeta queries) lanzan este error cuando algo no se puede
    hacer (producto inexistente, stock insuficiente, datos incompletos...).
    app.py lo captura y responde: {"error": mensaje} con el código indicado.
    """

    def __init__(self, mensaje, codigo=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


class NoEncontrado(ErrorAPI):
    def __init__(self, mensaje="Recurso no encontrado"):
        super().__init__(mensaje, 404)
