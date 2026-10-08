import os
from dotenv import load_dotenv

# Lee el archivo .env ubicado en SGI_FASE1 (junto a este archivo)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Neon cierra las conexiones inactivas: se verifica cada conexión antes
    # de usarla y se renuevan cada 5 minutos para evitar errores "SSL closed".
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    PORT = int(os.getenv("PORT", 5000))

    # Orígenes del front de Angular (ng serve) que pueden llamar a la API
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200,https://sgi-1-9kg9.onrender.com"
    ).split(",")
