import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from database import db
from routes import register_blueprints

load_dotenv()

app = Flask(__name__)

# Habilitar CORS para permitir peticiones desde el frontend
CORS(app)

# Configuración de base de datos
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inicializar SQLAlchemy con la aplicación Flask
db.init_app(app)

# Registrar Blueprints CRUD de cada tabla
register_blueprints(app)


@app.route("/")
def inicio():
    """Ruta raíz para verificar el estado de la API y la conexión a la base de datos."""
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "ok",
            "message": "¡API conectada exitosamente a la base de datos!",
            "endpoints": [
                "/api/usuarios",
                "/api/pedidos-proveedor",
                "/api/ventas",
                "/api/proveedores",
                "/api/traslados",
                "/api/inventario-local",
                "/api/productos",
                "/api/inventario-bodega"
            ]
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error de conexión: {str(e)}"}), 500


@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": str(error.description) if hasattr(error, 'description') else "Recurso no encontrado"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Error interno del servidor"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)