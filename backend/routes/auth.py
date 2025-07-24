import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.validators import validate_email, validate_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Registrace nového uživatele"""
    data = request.get_json()
    print("prijata data: ", data)

    # Validace vstupních dat
    if (
        not data
        or not data.get("email")
        or not data.get("password")
        or not data.get("jmeno")
    ):  
        return jsonify({"error": "Email, heslo a jméno jsou povinné"}), 400

    email = data["email"].lower()
    heslo = data["password"]
    jmeno = data["jmeno"]
    bio = data.get("bio", "")

    # Validace emailu
    if not validate_email(email):
        return jsonify({"error": "Neplatný formát emailu"}), 400

    # Validace hesla
    if not validate_password(heslo):
        return jsonify({"error": "Heslo musí mít alespoň 6 znaků"}), 400

    # Kontrola, zda uživatel již neexistuje
    if Uzivatel.query.filter_by(email=email).first():
        return jsonify({"error": "Uživatel s tímto emailem již existuje"}), 400

    try:
        # Vytvoření nového uživatele
        uzivatel = Uzivatel(email=email, heslo=heslo)
        db.session.add(uzivatel)
        db.session.flush()  # Získání ID pro profil

        # Vytvoření profilu
        profil = Profil(uzivatel_id=uzivatel.id, jmeno=jmeno, bio=bio)
        db.session.add(profil)
        db.session.commit()

        # Vytvoření JWT tokenu
        access_token = create_access_token(identity=uzivatel.id)

        return jsonify(
            {
                "message": "Uživatel úspěšně registrován",
                "access_token": access_token,
                "uzivatel": uzivatel.to_dict(),
            }
        ), 201

    except Exception as e:
        db.session.rollback()
        print(f"Chyba při registraci: {e}")  # Pro debug
        return jsonify({"error": f"Chyba při registraci: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Přihlášení uživatele"""
    data = request.get_json()
    print("prijata data", data)
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email a heslo jsou povinné"}), 400

    email = data["email"].lower()
    heslo = data["password"]

    # Nalezení uživatele
    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel or not uzivatel.check_heslo(heslo):
        return jsonify({"error": "Neplatné přihlašovací údaje"}), 401

    # Vytvoření JWT tokenu
    access_token = create_access_token(identity=uzivatel.id)

    return jsonify(
        {
            "message": "Úspěšně přihlášen",
            "access_token": access_token,
            "uzivatel": uzivatel.to_dict(),
        }
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Získání informací o aktuálním uživateli"""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get(uzivatel_id)

    if not uzivatel:
        return jsonify({"error": "Uživatel nenalezen"}), 404

    return jsonify({"uzivatel": uzivatel.to_dict()})


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Změna hesla"""
    uzivatel_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get("stare_heslo") or not data.get("nove_heslo"):
        return jsonify({"error": "Staré a nové heslo jsou povinné"}), 400

    uzivatel = Uzivatel.query.get(uzivatel_id)
    if not uzivatel:
        return jsonify({"error": "Uživatel nenalezen"}), 404

    # Ověření starého hesla
    if not uzivatel.check_heslo(data["stare_heslo"]):
        return jsonify({"error": "Neplatné staré heslo"}), 401

    # Validace nového hesla
    if not validate_password(data["nove_heslo"]):
        return jsonify({"error": "Nové heslo musí mít alespoň 6 znaků"}), 400

    try:
        uzivatel.set_heslo(data["nove_heslo"])
        db.session.commit()

        return jsonify({"message": "Heslo úspěšně změněno"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při změně hesla"}), 500
