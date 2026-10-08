from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from database import db
from routes import register_blueprints, BLUEPRINTS
from utils.errores import ErrorAPI
from utils.migraciones import aplicar_migraciones


def crear_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.json.ensure_ascii = False  # tildes y ñ legibles en el JSON

    if not app.config["SQLALCHEMY_DATABASE_URI"]:
        raise RuntimeError("Falta DATABASE_URL en el archivo .env (ver .env.example)")

    # Permite que el front de Angular (localhost:4200) consuma la API
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    db.init_app(app)

    # Crea/actualiza tablas y columnas nuevas (migraciones/*.sql, idempotentes)
    with app.app_context():
        try:
            aplicar_migraciones(app.logger)
        except Exception:  # noqa: BLE001
            app.logger.exception(
                "No se pudieron aplicar las migraciones. Revisa DATABASE_URL o ejecuta "
                "migraciones/*.sql manualmente en el SQL Editor de Neon."
            )

    register_blueprints(app)
    registrar_manejo_de_errores(app)

    @app.get("/")
    def inicio():
        """Verifica que la API esté arriba y conectada a la base de datos."""
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify({
                "status": "ok",
                "message": "¡API conectada exitosamente a la base de datos!",
                "endpoints": sorted({bp.url_prefix for bp in BLUEPRINTS}),
            })
        except Exception as e:  # noqa: BLE001
            return jsonify({"status": "error", "message": f"Error de conexión: {e}"}), 500

    return app


def registrar_manejo_de_errores(app):
    @app.errorhandler(ErrorAPI)
    def error_api(error):
        # Si algo falló a mitad de una operación, no se guarda nada
        db.session.rollback()
        return jsonify({"error": error.mensaje}), error.codigo

    @app.errorhandler(HTTPException)
    def error_http(error):
        db.session.rollback()
        mensajes = {404: "Ruta no encontrada", 405: "Método no permitido para esta ruta"}
        return jsonify({"error": mensajes.get(error.code, error.description)}), error.code

    @app.errorhandler(Exception)
    def error_inesperado(error):
        db.session.rollback()
        app.logger.exception(error)
        return jsonify({"error": "Error interno del servidor"}), 500


app = crear_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
