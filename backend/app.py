import logging
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import BadRequest, HTTPException

load_dotenv()

from config import config
from models import db, init_app
from models.auto import Auto  # noqa
from models.blokace import Blokace  # noqa
from models.chat import Chat  # noqa
from models.hodnoceni import Hodnoceni  # noqa
from models.jizda import Jizda  # noqa
from models.mezistanice import Mezistanice  # noqa
from models.oznameni import Oznameni  # noqa
from models.pasazeri import pasazeri  # noqa
from models.profil import Profil  # noqa
from models.rezervace import Rezervace  # noqa
from models.ucastnici_chatu import ucastnici_chatu  # noqa
from models.uzivatel import Uzivatel  # noqa
from models.zprava import Zprava  # noqa

try:
    from routes.auth import auth_bp
    from routes.auta import auta_bp
    from routes.blokace import blokace_bp
    from routes.chat import chat_bp
    from routes.hodnoceni import hodnoceni_bp
    from routes.jizdy import jizdy_bp
    from routes.mesta import mesta_bp
    from routes.oznameni import oznameni_bp
    from routes.rezervace import rezervace_bp
    from routes.uzivatele import uzivatele_bp
except ImportError:
    logging.getLogger(__name__).exception("Chyba pri importu routes")


def create_app(config_name="development", test_config=None):
    """Vytvori Flask aplikaci a zaregistruje globalni infrastrukturu API."""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    if test_config:
        app.config.update(test_config)

    CORS(app)
    init_app(app)

    try:
        app.register_blueprint(auth_bp, url_prefix="/api/auth")
        app.register_blueprint(uzivatele_bp, url_prefix="/api/uzivatele")
        app.register_blueprint(jizdy_bp, url_prefix="/api/jizdy")
        app.register_blueprint(mesta_bp, url_prefix="/api/mesta")
        app.register_blueprint(rezervace_bp, url_prefix="/api/rezervace")
        app.register_blueprint(hodnoceni_bp, url_prefix="/api/hodnoceni")
        app.register_blueprint(chat_bp, url_prefix="/api/chat")
        app.register_blueprint(auta_bp, url_prefix="/api/auta")
        app.register_blueprint(blokace_bp, url_prefix="/api/blokace")
        app.register_blueprint(oznameni_bp, url_prefix="/api/oznameni")
    except NameError:
        app.logger.exception("Nektere blueprinty nejsou dostupne")

    @app.errorhandler(BadRequest)
    def handle_bad_request(error):
        # Sem padaji i chybne nebo nekompletni JSON requesty z Flasku/Werkzeugu.
        description = getattr(error, "description", None)
        if isinstance(description, str) and description:
            return jsonify({"error": description}), 400
        return jsonify({"error": "Neplatny pozadavek"}), 400

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        # Ostatni HTTP chyby drzime ve stejnem JSON formatu, aby frontend nemusel
        # rozlisovat mezi route-level a globalnim error handlingem.
        return jsonify({"error": error.description}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # Log si nechavame pro diagnostiku, ale ven vracime jen bezpecny fallback.
        app.logger.exception("Neocekavana chyba pri zpracovani requestu")
        return jsonify({"error": "Doslo k neocekavane chybe serveru"}), 500

    @app.route("/api/")
    def home():
        return {"message": "Spolujizda API v1.0", "status": "running"}

    with app.app_context():
        try:
            db.create_all()
        except Exception:
            app.logger.exception("Error creating tables")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
