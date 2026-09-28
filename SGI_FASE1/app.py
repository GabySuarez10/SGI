import os

from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


@app.route("/")
def inicio():
    try:
        db.session.execute(db.text("SELECT 1"))
        return "¡Conexión con Neon exitosa!"
    except Exception as e:
        return f"Error de conexión: {e}"


if __name__ == "__main__":
    app.run(debug=True)