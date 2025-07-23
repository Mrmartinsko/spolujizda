import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

# Načtení environment variables
load_dotenv()

from config import config
from models import db, init_app
from models.auto import Auto  # noqa
from models.blokace import Blokace  # noqa
from models.chat import Chat  # noqa
from models.hodnoceni import Hodnoceni  # noqa
from models.jizda import Jizda  # noqa
from models.pasazeri import pasazeri  # noqa
from models.profil import Profil  # noqa
from models.rezervace import Rezervace  # noqa
from models.ucastnici_chatu import ucastnici_chatu  # noqa

# Import všech modelů pro Migrate (potřebné pro správné fungování DB)
from models.uzivatel import Uzivatel  # noqa
from models.zprava import Zprava  # noqa

# Import routes
try:
    from routes.auta import auta_bp
    from routes.auth import auth_bp
    from routes.blokace import blokace_bp
    from routes.chat import chat_bp
    from routes.hodnoceni import hodnoceni_bp
    from routes.jizdy import jizdy_bp
    from routes.rezervace import rezervace_bp
    from routes.uzivatele import uzivatele_bp
except ImportError as e:
    print(f"Chyba při importu routes: {e}")
    print("Spouštím aplikaci bez některých routes...")


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # CORS pro React frontend
    CORS(app)

    # Inicializace extensions
    init_app(app)

    # Registrace blueprintů (s kontrolou existence)
    try:
        app.register_blueprint(auth_bp, url_prefix="/api/auth")
        app.register_blueprint(uzivatele_bp, url_prefix="/api/uzivatele")
        app.register_blueprint(jizdy_bp, url_prefix="/api/jizdy")
        app.register_blueprint(rezervace_bp, url_prefix="/api/rezervace")
        app.register_blueprint(hodnoceni_bp, url_prefix="/api/hodnoceni")
        app.register_blueprint(chat_bp, url_prefix="/api/chat")
        app.register_blueprint(auta_bp, url_prefix="/api/auta")
        app.register_blueprint(blokace_bp, url_prefix="/api/blokace")
    except NameError as e:
        print(f"Některé blueprinty nejsou dostupné: {e}")

    # Základní route
    @app.route("/api/")
    def home():
        return {"message": "Spolujízda API v1.0", "status": "running"}

    # Vytvoření tabulek
    with app.app_context():
        try:
            db.create_all()
            print("Databázové tabulky úspěšně vytvořeny")
        except Exception as e:
            print(f"Chyba při vytváření tabulek: {e}")

    return app


if __name__ == "__main__":
    app = create_app()
    print("🚗 Spolujízda API startuje...")
    print("📍 Backend běží na: http://localhost:5000")
    print("📍 API dokumentace: http://localhost:5000/api/")
    app.run(debug=True, port=5000)
