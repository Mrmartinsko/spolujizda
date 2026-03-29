import os
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.auth_tokens import generate_token_with_expiration
from utils.email_verification import generate_email_verification
from utils.mailer import send_password_reset_email, send_verification_email
from utils.validators import validate_email, validate_password, validate_phone


auth_bp = Blueprint("auth", __name__)


def _get_frontend_url():
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    if (
        not data
        or not data.get("email")
        or not data.get("password")
        or not data.get("jmeno")
        or not data.get("telefon")
    ):
        return jsonify({"error": "Email, heslo, uzivatelske jmeno a telefon jsou povinne"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]
    jmeno = data["jmeno"].strip()
    telefon = data["telefon"].strip()
    bio = data.get("bio", "")

    if not validate_email(email):
        return jsonify({"error": "Neplatny format emailu"}), 400

    if not validate_password(heslo):
        return jsonify({"error": "Heslo musi mit alespon 6 znaku"}), 400

    if not validate_phone(telefon):
        return jsonify({"error": "Telefon musi byt ve formatu napr. +420 123 456 789"}), 400

    if not jmeno:
        return jsonify({"error": "Uzivatelske jmeno je povinne"}), 400

    if len(jmeno) > 20:
        return jsonify({"error": "Uzivatelske jmeno muze mit maximalne 20 znaku."}), 400

    if Uzivatel.query.filter_by(email=email).first():
        return jsonify({"error": "Uzivatel s timto emailem jiz existuje"}), 400

    existing_profile = Profil.query.filter(db.func.lower(Profil.jmeno) == jmeno.lower()).first()
    if existing_profile:
        return jsonify({"error": "Toto uzivatelske jmeno je jiz obsazene."}), 400

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
        print(f"VERIFY LINK: {verify_url}")
        send_verification_email(email, verify_url)

        return jsonify(
            {
                "message": "Registrace probehla. Over email, nez se prihlasis.",
                "requires_email_verification": True,
                "email": email,
            }
        ), 201

    except Exception as e:
        db.session.rollback()
        print(f"Chyba pri registraci: {e}")
        return jsonify({"error": f"Chyba pri registraci: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email a heslo jsou povinne"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel or not uzivatel.check_heslo(heslo):
        return jsonify({"error": "Spatne prihlasovaci udaje"}), 401

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email neni overen",
                "requires_email_verification": True,
                "email": email,
            }
        ), 403

    access_token = create_access_token(identity=str(uzivatel.id))

    return jsonify(
        {
            "message": "Uspesne prihlasen",
            "access_token": access_token,
            "uzivatel": uzivatel.to_dict(),
        }
    ), 200


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return jsonify({"error": "Email je povinny"}), 400

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel:
        return jsonify({"message": "Pokud ucet existuje, overovaci email byl odeslan"}), 200

    if uzivatel.email_verified:
        return jsonify({"message": "Email uz je overen"}), 200

    try:
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

        verify_url = f"{_get_frontend_url()}/verify-email/{token}"
        print(f"VERIFY LINK (RESEND): {verify_url}")
        send_verification_email(email, verify_url)

        return jsonify({"message": "Pokud ucet existuje, overovaci email byl odeslan"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri odesilani overovaciho emailu"}), 500


@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):
    if not token:
        return jsonify({"error": "Chybi token"}), 400

    uzivatel = Uzivatel.query.filter_by(email_verification_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatny nebo pouzity token"}), 400

    if uzivatel.email_verified:
        return jsonify({"message": "Email uz je overen"}), 200

    if (
        not uzivatel.email_verification_expires_at
        or uzivatel.email_verification_expires_at < datetime.utcnow()
    ):
        return jsonify({"error": "Token vyprsel"}), 400

    try:
        uzivatel.email_verified = True
        uzivatel.email_verified_at = datetime.utcnow()
        uzivatel.email_verification_token = None
        uzivatel.email_verification_expires_at = None
        db.session.commit()
        return jsonify({"message": "Email uspesne overen"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri overeni emailu"}), 500


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return jsonify({"error": "Email je povinny"}), 400

    if not validate_email(email):
        return jsonify({"error": "Neplatny format emailu"}), 400

    safe_message = "Pokud ucet existuje, poslali jsme email s instrukcemi pro obnovu hesla."
    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel:
        return jsonify({"message": safe_message}), 200

    try:
        token, expires_at = generate_token_with_expiration(hours=2)
        uzivatel.password_reset_token = token
        uzivatel.password_reset_expires_at = expires_at
        db.session.commit()

        reset_url = f"{_get_frontend_url()}/reset-password/{token}"
        print(f"RESET PASSWORD LINK: {reset_url}")
        send_password_reset_email(email, reset_url)

        return jsonify({"message": safe_message}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri zpracovani zadosti o reset hesla"}), 500


@auth_bp.route("/reset-password/<token>", methods=["GET"])
def verify_reset_password_token(token):
    if not token:
        return jsonify({"error": "Chybi token"}), 400

    uzivatel = Uzivatel.query.filter_by(password_reset_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatny nebo jiz pouzity token"}), 400

    if (
        not uzivatel.password_reset_expires_at
        or uzivatel.password_reset_expires_at < datetime.utcnow()
    ):
        return jsonify({"error": "Token vyprsel"}), 400

    return jsonify({"message": "Token je platny"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""

    if not token or not new_password:
        return jsonify({"error": "Token a nove heslo jsou povinne"}), 400

    uzivatel = Uzivatel.query.filter_by(password_reset_token=token).first()
    if not uzivatel:
        return jsonify({"error": "Neplatny nebo jiz pouzity token"}), 400

    if (
        not uzivatel.password_reset_expires_at
        or uzivatel.password_reset_expires_at < datetime.utcnow()
    ):
        return jsonify({"error": "Token vyprsel"}), 400

    if not validate_password(new_password):
        return jsonify({"error": "Nove heslo musi mit alespon 6 znaku"}), 400

    try:
        uzivatel.set_heslo(new_password)
        uzivatel.password_reset_token = None
        uzivatel.password_reset_expires_at = None
        db.session.commit()
        return jsonify({"message": "Heslo bylo uspesne obnoveno"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri obnoveni hesla"}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get(uzivatel_id)

    if not uzivatel:
        return jsonify({"error": "Uzivatel nenalezen"}), 404

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email neni overen",
                "requires_email_verification": True,
                "email": uzivatel.email,
            }
        ), 403

    return jsonify({"uzivatel": uzivatel.to_dict()}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    uzivatel_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    if not data.get("stare_heslo") or not data.get("nove_heslo"):
        return jsonify({"error": "Stare a nove heslo jsou povinne"}), 400

    uzivatel = Uzivatel.query.get(uzivatel_id)
    if not uzivatel:
        return jsonify({"error": "Uzivatel nenalezen"}), 404

    if not uzivatel.check_heslo(data["stare_heslo"]):
        return jsonify({"error": "Neplatne stare heslo"}), 401

    if not validate_password(data["nove_heslo"]):
        return jsonify({"error": "Nove heslo musi mit alespon 6 znaku"}), 400

    try:
        uzivatel.set_heslo(data["nove_heslo"])
        db.session.commit()
        return jsonify({"message": "Heslo uspesne zmeneno"}), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri zmene hesla"}), 500
