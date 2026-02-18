from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.email_verification import generate_email_verification
from utils.mailer import send_verification_email
from utils.validators import validate_email, validate_password, validate_phone


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Registrace nového uživatele (musí ověřit email před přihlášením)."""
    data = request.get_json(silent=True) or {}

    if (
        not data
        or not data.get("email")
        or not data.get("password")
        or not data.get("jmeno")
        or not data.get("telefon")
    ):
        return jsonify({"error": "Email, heslo, uživatelské jméno a telefon jsou povinné"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]
    jmeno = data["jmeno"].strip()
    telefon = data["telefon"].strip()
    bio = data.get("bio", "")

    if not validate_email(email):
        return jsonify({"error": "Neplatný formát emailu"}), 400

    if not validate_password(heslo):
        return jsonify({"error": "Heslo musí mít alespoň 6 znaků"}), 400

    if not validate_phone(telefon):
        return jsonify({"error": "Telefon musí být ve formátu např. +420 123 456 789"}), 400

    if not jmeno:
        return jsonify({"error": "Uživatelské jméno je povinné"}), 400

    if len(jmeno) > 20:
        return jsonify({"error": "Uživatelské jméno může mít maximálně 20 znaků."}), 400

    if Uzivatel.query.filter_by(email=email).first():
        return jsonify({"error": "Uživatel s tímto emailem již existuje"}), 400

    existing_profile = Profil.query.filter(db.func.lower(Profil.jmeno) == jmeno.lower()).first()
    if existing_profile:
        return jsonify({"error": "Toto uživatelské jméno je již obsazené."}), 400

    try:
        uzivatel = Uzivatel(email=email, heslo=heslo)

        token, expires_at = generate_email_verification(hours=24)
        uzivatel.email_verified = False
        uzivatel.email_verified_at = None
        uzivatel.email_verification_token = token
        uzivatel.email_verification_expires_at = expires_at

        db.session.add(uzivatel)
        db.session.flush()

        profil = Profil(uzivatel_id=uzivatel.id, jmeno=jmeno, bio=bio)
        db.session.add(profil)
        db.session.commit()

        print(f"VERIFY LINK: http://localhost:3000/verify-email/{token}")
        verify_url = f"http://localhost:3000/verify-email/{token}"
        send_verification_email(email, verify_url)

        return jsonify(
            {
                "message": "Registrace proběhla. Ověř email, než se přihlásíš.",
                "requires_email_verification": True,
                "email": email,
            }
        ), 201

    except Exception as e:
        db.session.rollback()
        print(f"Chyba při registraci: {e}")
        return jsonify({"error": f"Chyba při registraci: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Přihlášení uživatele (neověřený email = 403 bez tokenu)."""
    data = request.get_json(silent=True) or {}

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email a heslo jsou povinné"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel or not uzivatel.check_heslo(heslo):
        return jsonify({"error": "Špatné přihlašovací údaje"}), 401

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email není ověřen",
                "requires_email_verification": True,
                "email": email,
            }
        ), 403

    access_token = create_access_token(identity=str(uzivatel.id))

    return jsonify(
        {
            "message": "Úspěšně přihlášen",
            "access_token": access_token,
            "uzivatel": uzivatel.to_dict(),
        }
    ), 200


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """
    Znovu pošle ověřovací link podle emailu.
    Bez JWT, protože neověřený uživatel se nepřihlásí.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return jsonify({"error": "Email je povinný"}), 400

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    # Bezpečnost: neprozrazujeme existenci účtu
    if not uzivatel:
        return jsonify({"message": "Pokud účet existuje, ověřovací email byl odeslán"}), 200

    if uzivatel.email_verified:
        return jsonify({"message": "Email už je ověřen"}), 200

    try:
        # Pokud už má platný token, použijeme ten samý
        if (
            uzivatel.email_verification_token
            and uzivatel.email_verification_expires_at
            and uzivatel.email_verification_expires_at > datetime.utcnow()
        ):
            token = uzivatel.email_verification_token
        else:
            token, expires_at = generate_email_verification(hours=24)
            uzivatel.email_verification_token = token
            uzivatel.email_verification_expires_at = expires_at
            db.session.commit()

        verify_url = f"http://localhost:3000/verify-email/{token}"

        print(f"VERIFY LINK (RESEND): {verify_url}")
        send_verification_email(email, verify_url)

        return jsonify({"message": "Pokud účet existuje, ověřovací email byl odeslán"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při odesílání ověřovacího emailu"}), 500


@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):
    """Ověření emailu přes token."""
    if not token:
        return jsonify({"error": "Chybí token"}), 400

    uzivatel = Uzivatel.query.filter_by(email_verification_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatný nebo použitý token"}), 400

    if uzivatel.email_verified:
        return jsonify({"message": "Email už je ověřen"}), 200

    if (
        not uzivatel.email_verification_expires_at
        or uzivatel.email_verification_expires_at < datetime.utcnow()
    ):
        return jsonify({"error": "Token vypršel"}), 400

    try:
        uzivatel.email_verified = True
        uzivatel.email_verified_at = datetime.utcnow()
        uzivatel.email_verification_token = None
        uzivatel.email_verification_expires_at = None
        db.session.commit()
        return jsonify({"message": "Email úspěšně ověřen"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při ověření emailu"}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Získání informací o aktuálním uživateli (neověřený email = 403)."""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get(uzivatel_id)

    if not uzivatel:
        return jsonify({"error": "Uživatel nenalezen"}), 404

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email není ověřen",
                "requires_email_verification": True,
                "email": uzivatel.email,
            }
        ), 403

    return jsonify({"uzivatel": uzivatel.to_dict()}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Změna hesla."""
    uzivatel_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get("stare_heslo") or not data.get("nove_heslo"):
        return jsonify({"error": "Staré a nové heslo jsou povinné"}), 400

    uzivatel = Uzivatel.query.get(uzivatel_id)
    if not uzivatel:
        return jsonify({"error": "Uživatel nenalezen"}), 404

    if not uzivatel.check_heslo(data["stare_heslo"]):
        return jsonify({"error": "Neplatné staré heslo"}), 401

    if not validate_password(data["nove_heslo"]):
        return jsonify({"error": "Nové heslo musí mít alespoň 6 znaků"}), 400

    try:
        uzivatel.set_heslo(data["nove_heslo"])
        db.session.commit()
        return jsonify({"message": "Heslo úspěšně změněno"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při změně hesla"}), 500
