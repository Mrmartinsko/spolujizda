import os
from logging import getLogger

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.auth_tokens import generate_token_with_expiration
from utils.api import error_response, get_json_data, get_str_field
from utils.datetime_utils import utc_now
from utils.email_verification import generate_email_verification
from utils.mailer import send_password_reset_email, send_verification_email
from utils.validators import validate_email, validate_password, validate_phone


auth_bp = Blueprint("auth", __name__)
logger = getLogger(__name__)


def _get_frontend_url():
    """Vrátí frontend URL bez koncového lomítka pro skládání odkazů v emailech."""
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Zaregistruje uživatele a připraví email verification před prvním loginem."""
    data, error = get_json_data()
    if error:
        return error

    email, email_error = get_str_field(data, "email", required=True)
    if email_error:
        return error_response(email_error)

    heslo, password_error = get_str_field(data, "password", required=True)
    if password_error:
        return error_response(password_error)

    jmeno, name_error = get_str_field(data, "jmeno", required=True, max_length=50)
    if name_error:
        return error_response(name_error)

    telefon, phone_error = get_str_field(data, "telefon", required=True)
    if phone_error:
        return error_response(phone_error)

    bio, bio_error = get_str_field(data, "bio", max_length=500)
    if bio_error:
        return error_response(bio_error)

    # Email sjednocujeme na lower-case, aby se duplicity neschovaly za různé varianty zápisu.
    email = email.lower()
    bio = bio or ""

    if not validate_email(email):
        return error_response("Neplatný formát emailu")

    if not validate_password(heslo):
        return error_response("Heslo musí mít alespoň 6 znaků")

    if not validate_phone(telefon):
        return error_response("Telefon musí být ve formátu např. +420 123 456 789")

    if Uzivatel.query.filter_by(email=email).first():
        return error_response("Uživatel s tímto emailem již existuje")

    existing_profile = Profil.query.filter(db.func.lower(Profil.jmeno) == jmeno.lower()).first()
    if existing_profile:
        return error_response("Toto uživatelské jméno je již obsazené.")

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

        verify_url = f"{_get_frontend_url()}/verify-email/{token}"
        send_verification_email(email, verify_url)

        return jsonify(
            {
                "message": "Registrace proběhla. Ověř email, než se přihlásíš.",
                "requires_email_verification": True,
                "email": email,
            }
        ), 201

    except Exception:
        db.session.rollback()
        logger.exception("Chyba při registraci")
        return error_response("Chyba při registraci", 500)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Přihlásí jen ověřeného uživatele a vrátí JWT pro další API volání."""
    data, error = get_json_data()
    if error:
        return error

    email, email_error = get_str_field(data, "email", required=True)
    if email_error:
        return error_response(email_error)

    heslo, password_error = get_str_field(data, "password", required=True)
    if password_error:
        return error_response(password_error)

    email = email.lower()

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
    """Znovu pošle ověřovací email nebo znovu použije stále platný token."""
    data, error = get_json_data()
    if error:
        return error

    email, email_error = get_str_field(data, "email", required=True)
    if email_error:
        return error_response(email_error)
    email = email.lower()

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel:
        return jsonify({"message": "Pokud účet existuje, ověřovací email byl odeslán"}), 200

    if uzivatel.email_verified:
        return jsonify({"message": "Email už je ověřen"}), 200

    try:
        # Když je původní token pořád platný, nemá smysl vytvářet další aktivní odkaz.
        if (
            uzivatel.email_verification_token
            and uzivatel.email_verification_expires_at
            and uzivatel.email_verification_expires_at > utc_now()
        ):
            token = uzivatel.email_verification_token
        else:
            token, expires_at = generate_email_verification(hours=24)
            uzivatel.email_verification_token = token
            uzivatel.email_verification_expires_at = expires_at
            db.session.commit()

        verify_url = f"{_get_frontend_url()}/verify-email/{token}"
        send_verification_email(email, verify_url)

        return jsonify({"message": "Pokud účet existuje, ověřovací email byl odeslán"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při odesílání ověřovacího emailu"}), 500


@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):
    """Potvrdí email pomocí jednorázového tokenu s expirací."""
    if not token:
        return jsonify({"error": "Chybí token"}), 400

    uzivatel = Uzivatel.query.filter_by(email_verification_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatný nebo použitý token"}), 400

    if uzivatel.email_verified:
        return jsonify({"message": "Email už je ověřen"}), 200

    if (
        not uzivatel.email_verification_expires_at
        or uzivatel.email_verification_expires_at < utc_now()
    ):
        return jsonify({"error": "Token vypršel"}), 400

    try:
        uzivatel.email_verified = True
        uzivatel.email_verified_at = utc_now()
        uzivatel.email_verification_token = None
        uzivatel.email_verification_expires_at = None
        db.session.commit()
        return jsonify({"message": "Email úspěšně ověřen"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při ověření emailu"}), 500


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Spustí bezpečný reset hesla bez prozrazení existence účtu."""
    data, error = get_json_data()
    if error:
        return error

    email, email_error = get_str_field(data, "email", required=True)
    if email_error:
        return error_response(email_error)
    email = email.lower()

    if not validate_email(email):
        return jsonify({"error": "Neplatný formát emailu"}), 400

    # Stejná zpráva pro existující i neexistující email omezuje enumeraci účtů.
    safe_message = "Pokud účet existuje, poslali jsme email s instrukcemi pro obnovu hesla."
    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel:
        return jsonify({"message": safe_message}), 200

    try:
        token, expires_at = generate_token_with_expiration(hours=2)
        uzivatel.password_reset_token = token
        uzivatel.password_reset_expires_at = expires_at
        db.session.commit()

        reset_url = f"{_get_frontend_url()}/reset-password/{token}"
        send_password_reset_email(email, reset_url)

        return jsonify({"message": safe_message}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při zpracování žádosti o reset hesla"}), 500


@auth_bp.route("/reset-password/<token>", methods=["GET"])
def verify_reset_password_token(token):
    """Ověří, že reset token stále existuje a ještě nevypršel."""
    if not token:
        return jsonify({"error": "Chybí token"}), 400

    uzivatel = Uzivatel.query.filter_by(password_reset_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatný nebo již použitý token"}), 400

    if (
        not uzivatel.password_reset_expires_at
        or uzivatel.password_reset_expires_at < utc_now()
    ):
        return jsonify({"error": "Token vypršel"}), 400

    return jsonify({"message": "Token je platný"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Nastaví nové heslo a zneplatní použitý reset token."""
    data, error = get_json_data()
    if error:
        return error

    token, token_error = get_str_field(data, "token", required=True)
    if token_error:
        return error_response(token_error)

    new_password, password_error = get_str_field(data, "new_password", required=True)
    if password_error:
        return error_response(password_error)

    uzivatel = Uzivatel.query.filter_by(password_reset_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatný nebo již použitý token"}), 400

    if (
        not uzivatel.password_reset_expires_at
        or uzivatel.password_reset_expires_at < utc_now()
    ):
        return jsonify({"error": "Token vypršel"}), 400

    if not validate_password(new_password):
        return jsonify({"error": "Nové heslo musí mít alespoň 6 znaků"}), 400

    try:
        uzivatel.set_heslo(new_password)
        uzivatel.password_reset_token = None
        uzivatel.password_reset_expires_at = None
        db.session.commit()
        return jsonify({"message": "Heslo bylo úspěšně obnoveno"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při obnovení hesla"}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Vrátí aktuálně přihlášeného uživatele pro obnovu session ve frontendu."""
    uzivatel_id = get_jwt_identity()
    uzivatel = db.session.get(Uzivatel, int(uzivatel_id))

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
    """Změní heslo jen po kontrole původního hesla aktuálního uživatele."""
    uzivatel_id = get_jwt_identity()
    data, error = get_json_data()
    if error:
        return error

    stare_heslo, old_password_error = get_str_field(data, "stare_heslo", required=True)
    if old_password_error:
        return error_response(old_password_error)

    nove_heslo, new_password_error = get_str_field(data, "nove_heslo", required=True)
    if new_password_error:
        return error_response(new_password_error)

    uzivatel = db.session.get(Uzivatel, int(uzivatel_id))
    if not uzivatel:
        return jsonify({"error": "Uživatel nenalezen"}), 404

    if not uzivatel.check_heslo(stare_heslo):
        return jsonify({"error": "Neplatné staré heslo"}), 401

    if not validate_password(nove_heslo):
        return jsonify({"error": "Nové heslo musí mít alespoň 6 znaků"}), 400

    try:
        uzivatel.set_heslo(nove_heslo)
        db.session.commit()
        return jsonify({"message": "Heslo úspěšně změněno"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při změně hesla"}), 500