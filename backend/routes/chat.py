from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.chat import Chat
from models.jizda import Jizda
from models.uzivatel import Uzivatel
from models.zprava import Zprava
from routes.oznameni import vytvorit_oznameni

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/jizda/<int:jizda_id>", methods=["GET"])
@jwt_required()
def get_jizda_chat(jizda_id):
    """Získání chatu jízdy"""
    uzivatel_id = int(get_jwt_identity())

    # Ověření existence jízdy
    jizda = Jizda.query.get_or_404(jizda_id)

    # Kontrola oprávnění - pouze řidič a přijatí pasažéři
    if jizda.ridic_id != uzivatel_id and not any(
        p.id == uzivatel_id for p in jizda.pasazeri
    ):
        return jsonify({"error": "Nemáte přístup k tomuto chatu"}), 403

    # Získání nebo vytvoření chatu
    chat = Chat.query.filter_by(jizda_id=jizda_id).first()
    if not chat:
        chat = Chat(jizda_id=jizda_id)
        # Přidání řidiče a všech pasažérů do chatu
        chat.ucastnici.append(jizda.ridic)
        for pasazer in jizda.pasazeri:
            if pasazer not in chat.ucastnici:
                chat.ucastnici.append(pasazer)

        db.session.add(chat)
        db.session.commit()

    # Získání zpráv
    zpravy = (
        Zprava.query.filter_by(chat_id=chat.id)
        .order_by(Zprava.cas.desc())
        .limit(50)
        .all()
    )

    return jsonify(
        {"chat": chat.to_dict(), "zpravy": [z.to_dict() for z in reversed(zpravy)]}
    )

def serialize_ucastnici(chat):
    """Vrátí seznam účastníků s id, emailem a jménem"""
    return [
        {
            "id": u.id,
            "email": u.email,
            "jmeno": u.profil.jmeno if u.profil else None
        }
        for u in chat.ucastnici
    ]

def serialize_ucastnici(chat):
    """Vrátí seznam účastníků s id, emailem a jménem"""
    return [
        {
            "id": u.id,
            "email": u.email,
            "jmeno": u.profil.jmeno if u.profil else None
        }
        for u in chat.ucastnici
    ]

def get_posledni_zprava(chat):
    """Vrátí poslední zprávu s odesílatelem"""
    zpravy = Zprava.query.filter_by(chat_id=chat.id).order_by(Zprava.cas.desc()).all()
    if not zpravy:
        return None

    posledni = zpravy[-1]  # nejnovější
    odesilatel = Uzivatel.query.get(posledni.odesilatel_id)
    return {
        "id": posledni.id,
        "text": posledni.text,
        "cas": posledni.cas,
        "odesilatel": {
            "id": odesilatel.id,
            "email": odesilatel.email,
            "jmeno": odesilatel.profil.jmeno if odesilatel.profil else None
        }
    }

@chat_bp.route("/osobni/<int:druhy_uzivatel_id>", methods=["GET"])
@jwt_required()
def get_osobni_chat(druhy_uzivatel_id):
    uzivatel_id = int(get_jwt_identity())

    if uzivatel_id == druhy_uzivatel_id:
        return jsonify({"error": "Nemůžete chatovat sami se sebou"}), 400

    druhy_uzivatel = Uzivatel.query.get_or_404(druhy_uzivatel_id)

    chat = Chat.query.filter(
        Chat.jizda_id.is_(None),
        Chat.ucastnici.any(Uzivatel.id == uzivatel_id),
        Chat.ucastnici.any(Uzivatel.id == druhy_uzivatel_id),
    ).first()

    if not chat:
        chat = Chat()
        chat.ucastnici.append(Uzivatel.query.get(uzivatel_id))
        chat.ucastnici.append(druhy_uzivatel)

        db.session.add(chat)
        db.session.commit()

    zpravy = Zprava.query.filter_by(chat_id=chat.id).order_by(Zprava.cas.desc()).limit(50).all()

    return jsonify({
        "chat": {**chat.to_dict(), "ucastnici": serialize_ucastnici(chat)},
        "zpravy": [z.to_dict() for z in reversed(zpravy)],
        "posledni_zprava": get_posledni_zprava(chat)
    })



@chat_bp.route("/<int:chat_id>/zpravy", methods=["POST"])
@jwt_required()
def odeslat_zpravu(chat_id):
    """Odeslání zprávy do chatu"""
    uzivatel_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not data.get("text"):
        return jsonify({"error": "Text zprávy je povinný"}), 400

    # Ověření existence chatu
    chat = Chat.query.get_or_404(chat_id)

    # Kontrola oprávnění
    if not chat.muze_pristupovat(uzivatel_id):
        return jsonify({"error": "Nemáte přístup k tomuto chatu"}), 403

    try:
        zprava = Zprava(chat_id=chat_id, odesilatel_id=uzivatel_id, text=data["text"])

        db.session.add(zprava)
        db.session.commit()

        # Získání informací o odesílateli
        odesilatel = Uzivatel.query.get(uzivatel_id)
        jmeno_odesilatele = odesilatel.profil.jmeno if odesilatel.profil else odesilatel.email

        # Vytvoření oznámení pro všechny ostatní účastníky chatu
        for ucastnik in chat.ucastnici:
            if ucastnik.id != uzivatel_id:  # Neposílat oznámení sobě
                if chat.jizda_id:
                    # Chat jízdy
                    zprava_oznameni = f"Nová zpráva od {jmeno_odesilatele} v chatu jízdy {chat.jizda.odkud} → {chat.jizda.kam}"
                else:
                    # Osobní chat
                    zprava_oznameni = f"Nová zpráva od {jmeno_odesilatele}"

                vytvorit_oznameni(ucastnik.id, zprava_oznameni, "chat")

        return jsonify({"message": "Zpráva odeslána", "zprava": zprava.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při odesílání zprávy"}), 500


@chat_bp.route("/<int:chat_id>/zpravy", methods=["GET"])
@jwt_required()
def get_zpravy(chat_id):
    """Získání zpráv z chatu"""
    uzivatel_id = int(get_jwt_identity())

    # Parametry pro stránkování
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    # Ověření existence chatu
    chat = Chat.query.get_or_404(chat_id)

    # Kontrola oprávnění
    if not chat.muze_pristupovat(uzivatel_id):
        return jsonify({"error": "Nemáte přístup k tomuto chatu"}), 403

    # Získání zpráv se stránkováním
    zpravy_pagination = (
        Zprava.query.filter_by(chat_id=chat_id)
        .order_by(Zprava.cas.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify(
        {
            "zpravy": [z.to_dict() for z in reversed(zpravy_pagination.items)],
            "pagination": {
                "page": page,
                "pages": zpravy_pagination.pages,
                "per_page": per_page,
                "total": zpravy_pagination.total,
                "has_next": zpravy_pagination.has_next,
                "has_prev": zpravy_pagination.has_prev,
            },
        }
    )


@chat_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_chaty():
    uzivatel_id = int(get_jwt_identity())
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)
    chaty = uzivatel.chaty

    chaty_jizd = [c for c in chaty if c.jizda_id is not None]
    osobni_chaty = [c for c in chaty if c.jizda_id is None]

    return jsonify({
        "chaty_jizd": [
            {**c.to_dict(), "ucastnici": serialize_ucastnici(c), "posledni_zprava": get_posledni_zprava(c)}
            for c in chaty_jizd
        ],
        "osobni_chaty": [
            {**c.to_dict(), "ucastnici": serialize_ucastnici(c), "posledni_zprava": get_posledni_zprava(c)}
            for c in osobni_chaty
        ]
    })



@chat_bp.route("/zprava/<int:zprava_id>", methods=["DELETE"])
@jwt_required()
def smazat_zpravu(zprava_id):
    """Smazání zprávy (pouze autorem)"""
    uzivatel_id = int(get_jwt_identity())
    zprava = Zprava.query.get_or_404(zprava_id)

    # Pouze autor může smazat svou zprávu
    if zprava.odesilatel_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění smazat tuto zprávu"}), 403

    try:
        db.session.delete(zprava)
        db.session.commit()

        return jsonify({"message": "Zpráva smazána"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při mazání zprávy"}), 500

@chat_bp.route("/osobni/<int:chat_id>", methods=["DELETE"])
@jwt_required()
def delete_osobni_chat(chat_id):
    uzivatel_id = int(get_jwt_identity())

    chat = Chat.query.get_or_404(chat_id)

    # kontrola, že je to osobní chat a uživatel v něm je účastník
    if chat.jizda_id is not None or uzivatel_id not in [u.id for u in chat.ucastnici]:
        return jsonify({"error": "Nepovolený přístup"}), 403

    try:
        # smazání všech zpráv v chatu
        Zprava.query.filter_by(chat_id=chat.id).delete()
        # smazání chatu
        db.session.delete(chat)
        db.session.commit()
        return jsonify({"message": "Chat byl smazán"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Nepodařilo se smazat chat"}), 500