import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.validators import validate_email, validate_password, validate_phone
from utils.email_verification import generate_email_verification
from utils.mailer import send_verification_email


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Registrace novĂ©ho uĹľivatele (musĂ­ ovÄ›Ĺ™it email pĹ™ed pĹ™ihlĂˇĹˇenĂ­m)"""
    data = request.get_json(silent=True) or {}

    if (
        not data
        or not data.get("email")
        or not data.get("password")
        or not data.get("jmeno")
        or not data.get("telefon")
    ):
        return jsonify({"error": "Email, heslo, uĹľivatelskĂ© jmĂ©no a telefon jsou povinnĂ©"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]
    jmeno = data["jmeno"].strip()
    telefon = data["telefon"].strip()
    bio = data.get("bio", "")

    if not validate_email(email):
        return jsonify({"error": "NeplatnĂ˝ formĂˇt emailu"}), 400

    if not validate_password(heslo):
        return jsonify({"error": "Heslo musĂ­ mĂ­t alespoĹ 6 znakĹŻ"}), 400

    if not validate_phone(telefon):
        return jsonify({"error": "Telefon musĂ­ bĂ˝t ve formĂˇtu napĹ™. +420 123 456 789"}), 400

    if not jmeno:
        return jsonify({"error": "UĹľivatelskĂ© jmĂ©no je povinnĂ©"}), 400

    if len(jmeno) > 20:
        return jsonify({"error": "Uživatelské jméno může mít maximálně 20 znaků."}), 400

    if Uzivatel.query.filter_by(email=email).first():
        return jsonify({"error": "UĹľivatel s tĂ­mto emailem jiĹľ existuje"}), 400

    existing_profile = Profil.query.filter(db.func.lower(Profil.jmeno) == jmeno.lower()).first()
    if existing_profile:
        return jsonify({"error": "Toto uĹľivatelskĂ© jmĂ©no je jiĹľ obsazenĂ©."}), 400

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
                "message": "Registrace probÄ›hla. OvÄ›Ĺ™ email, neĹľ se pĹ™ihlĂˇsĂ­Ĺˇ.",
                "requires_email_verification": True,
                "email": email,
            }
        ), 201

    except Exception as e:
        db.session.rollback()
        print(f"Chyba pĹ™i registraci: {e}")
        return jsonify({"error": f"Chyba pĹ™i registraci: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """PĹ™ihlĂˇĹˇenĂ­ uĹľivatele (neovÄ›Ĺ™enĂ˝ email = 403 bez tokenu)"""
    data = request.get_json(silent=True) or {}

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email a heslo jsou povinnĂ©"}), 400

    email = data["email"].lower().strip()
    heslo = data["password"]

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    if not uzivatel or not uzivatel.check_heslo(heslo):
        return jsonify({"error": "Ĺ patnĂ© pĹ™ihlaĹˇovacĂ­ Ăşdaje"}), 401

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email nenĂ­ ovÄ›Ĺ™en",
                "requires_email_verification": True,
                "email": email,
            }
        ), 403

    access_token = create_access_token(identity=str(uzivatel.id))

    return jsonify(
        {
            "message": "ĂšspÄ›ĹˇnÄ› pĹ™ihlĂˇĹˇen",
            "access_token": access_token,
            "uzivatel": uzivatel.to_dict(),
        }
    ), 200


from datetime import datetime

@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """
    Znovu poÄąË‡le ovĂ„â€şÄąâ„˘ovacÄ‚Â­ link podle emailu.
    Bez JWT, protoÄąÄľe neovĂ„â€şÄąâ„˘enÄ‚Ëť uÄąÄľivatel se nepÄąâ„˘ihlÄ‚Ë‡sÄ‚Â­.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()

    if not email:
        return jsonify({"error": "Email je povinnÄ‚Ëť"}), 400

    uzivatel = Uzivatel.query.filter_by(email=email).first()

    # BezpeĂ„Ĺ¤nĂ„â€ş: neprozrazujeme existenci Ä‚ĹźĂ„Ĺ¤tu
    if not uzivatel:
        return jsonify({"message": "Pokud Ä‚ĹźĂ„Ĺ¤et existuje, ovĂ„â€şÄąâ„˘ovacÄ‚Â­ email byl odeslÄ‚Ë‡n"}), 200

    if uzivatel.email_verified:
        return jsonify({"message": "Email uÄąÄľ je ovĂ„â€şÄąâ„˘en"}), 200

    try:
        # Pokud uÄąÄľ mÄ‚Ë‡ platnÄ‚Ëť token, pouÄąÄľijeme ten samÄ‚Ëť
        if (
            uzivatel.email_verification_token and
            uzivatel.email_verification_expires_at and
            uzivatel.email_verification_expires_at > datetime.utcnow()
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

        return jsonify({"message": "Pokud Ä‚ĹźĂ„Ĺ¤et existuje, ovĂ„â€şÄąâ„˘ovacÄ‚Â­ email byl odeslÄ‚Ë‡n"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba pÄąâ„˘i odesÄ‚Â­lÄ‚Ë‡nÄ‚Â­ ovĂ„â€şÄąâ„˘ovacÄ‚Â­ho emailu"}), 500



@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):
    """OvĂ„â€şÄąâ„˘enÄ‚Â­ emailu pÄąâ„˘es token"""
    if not token:
        return jsonify({"error": "ChybÄ‚Â­ token"}), 400

    uzivatel = Uzivatel.query.filter_by(email_verification_token=token).first()
    if not uzivatel:
        return jsonify({"error": "NeplatnÄ‚Ëť nebo pouÄąÄľitÄ‚Ëť token"}), 400

    if uzivatel.email_verified:
        return jsonify({"message": "Email uÄąÄľ je ovĂ„â€şÄąâ„˘en"}), 200

    if (
        not uzivatel.email_verification_expires_at
        or uzivatel.email_verification_expires_at < datetime.utcnow()
    ):
        return jsonify({"error": "Token vyprÄąË‡el"}), 400

    try:
        uzivatel.email_verified = True
        uzivatel.email_verified_at = datetime.utcnow()
        uzivatel.email_verification_token = None
        uzivatel.email_verification_expires_at = None
        db.session.commit()
        return jsonify({"message": "Email Ä‚ĹźspĂ„â€şÄąË‡nĂ„â€ş ovĂ„â€şÄąâ„˘en"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba pÄąâ„˘i ovĂ„â€şÄąâ„˘enÄ‚Â­ emailu"}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """ZÄ‚Â­skÄ‚Ë‡nÄ‚Â­ informacÄ‚Â­ o aktuÄ‚Ë‡lnÄ‚Â­m uÄąÄľivateli (neovĂ„â€şÄąâ„˘enÄ‚Ëť email = 403)"""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get(uzivatel_id)

    if not uzivatel:
        return jsonify({"error": "UÄąÄľivatel nenalezen"}), 404

    if not uzivatel.email_verified:
        return jsonify(
            {
                "error": "Email nenÄ‚Â­ ovĂ„â€şÄąâ„˘en",
                "requires_email_verification": True,
                "email": uzivatel.email,
            }
        ), 403

    return jsonify({"uzivatel": uzivatel.to_dict()}), 200



@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """ZmĂ„â€şna hesla"""
    uzivatel_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get("stare_heslo") or not data.get("nove_heslo"):
        return jsonify({"error": "StarÄ‚Â© a novÄ‚Â© heslo jsou povinnÄ‚Â©"}), 400

    uzivatel = Uzivatel.query.get(uzivatel_id)
    if not uzivatel:
        return jsonify({"error": "UÄąÄľivatel nenalezen"}), 404

    if not uzivatel.check_heslo(data["stare_heslo"]):
        return jsonify({"error": "NeplatnÄ‚Â© starÄ‚Â© heslo"}), 401

    if not validate_password(data["nove_heslo"]):
        return jsonify({"error": "NovÄ‚Â© heslo musÄ‚Â­ mÄ‚Â­t alespoÄąÂ 6 znakÄąĹ»"}), 400

    try:
        uzivatel.set_heslo(data["nove_heslo"])
        db.session.commit()
        return jsonify({"message": "Heslo Ä‚ĹźspĂ„â€şÄąË‡nĂ„â€ş zmĂ„â€şnĂ„â€şno"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba pÄąâ„˘i zmĂ„â€şnĂ„â€ş hesla"}), 500


