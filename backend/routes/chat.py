from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.chat import Chat
from models.jizda import Jizda
from models.uzivatel import Uzivatel
from models.zprava import Zprava
from utils.api import error_response, get_json_data, get_str_field
from utils.notifications import vytvorit_oznameni

chat_bp = Blueprint("chat", __name__)


def serialize_ucastnici(chat):
    return [
        {
            "id": user.id,
            "email": user.email,
            "jmeno": user.profil.jmeno if user.profil else None,
        }
        for user in chat.ucastnici
    ]


def get_posledni_zprava(chat):
    posledni = Zprava.query.filter_by(chat_id=chat.id).order_by(Zprava.cas.desc()).first()
    if not posledni:
        return None

    odesilatel = db.session.get(Uzivatel, posledni.odesilatel_id)
    if not odesilatel:
        return None

    return {
        "id": posledni.id,
        "text": posledni.text,
        "cas": posledni.cas,
        "odesilatel": {
            "id": odesilatel.id,
            "email": odesilatel.email,
            "jmeno": odesilatel.profil.jmeno if odesilatel.profil else None,
        },
    }


@chat_bp.route("/jizda/<int:jizda_id>", methods=["GET"])
@jwt_required()
def get_jizda_chat(jizda_id):
    uzivatel_id = int(get_jwt_identity())
    jizda = db.session.get(Jizda, jizda_id)
    if not jizda:
        return error_response("Jizda nenalezena", 404)

    if jizda.ridic_id != uzivatel_id and not any(p.id == uzivatel_id for p in jizda.pasazeri):
        return error_response("Nemate pristup k tomuto chatu", 403)

    chat = Chat.query.filter_by(jizda_id=jizda_id).first()
    if not chat:
        chat = Chat(jizda_id=jizda_id)
        chat.ucastnici.append(jizda.ridic)
        for pasazer in jizda.pasazeri:
            if pasazer not in chat.ucastnici:
                chat.ucastnici.append(pasazer)
        db.session.add(chat)
        db.session.commit()

    zpravy = (
        Zprava.query.filter_by(chat_id=chat.id).order_by(Zprava.cas.desc()).limit(50).all()
    )
    return jsonify({"chat": chat.to_dict(), "zpravy": [z.to_dict() for z in reversed(zpravy)]})


@chat_bp.route("/osobni/<int:druhy_uzivatel_id>", methods=["GET"])
@jwt_required()
def get_osobni_chat(druhy_uzivatel_id):
    uzivatel_id = int(get_jwt_identity())
    if uzivatel_id == druhy_uzivatel_id:
        return error_response("Nemuzete chatovat sami se sebou")

    druhy_uzivatel = db.session.get(Uzivatel, druhy_uzivatel_id)
    if not druhy_uzivatel:
        return error_response("Uzivatel nenalezen", 404)

    chat = Chat.query.filter(
        Chat.jizda_id.is_(None),
        Chat.ucastnici.any(Uzivatel.id == uzivatel_id),
        Chat.ucastnici.any(Uzivatel.id == druhy_uzivatel_id),
    ).first()

    if not chat:
        aktualni_uzivatel = db.session.get(Uzivatel, uzivatel_id)
        if not aktualni_uzivatel:
            return error_response("Uzivatel nenalezen", 404)

        chat = Chat()
        chat.ucastnici.append(aktualni_uzivatel)
        chat.ucastnici.append(druhy_uzivatel)
        db.session.add(chat)
        db.session.commit()

    zpravy = Zprava.query.filter_by(chat_id=chat.id).order_by(Zprava.cas.desc()).limit(50).all()
    return jsonify(
        {
            "chat": {**chat.to_dict(), "ucastnici": serialize_ucastnici(chat)},
            "zpravy": [z.to_dict() for z in reversed(zpravy)],
            "posledni_zprava": get_posledni_zprava(chat),
        }
    )


@chat_bp.route("/<int:chat_id>/zpravy", methods=["POST"])
@jwt_required()
def odeslat_zpravu(chat_id):
    uzivatel_id = int(get_jwt_identity())
    data, error = get_json_data()
    if error:
        return error

    text, text_error = get_str_field(data, "text", required=True, max_length=2000)
    if text_error:
        return error_response(text_error)

    chat = db.session.get(Chat, chat_id)
    if not chat:
        return error_response("Chat nenalezen", 404)
    if not chat.muze_pristupovat(uzivatel_id):
        return error_response("Nemate pristup k tomuto chatu", 403)

    try:
        zprava = Zprava(chat_id=chat_id, odesilatel_id=uzivatel_id, text=text)
        db.session.add(zprava)
        db.session.commit()

        odesilatel = db.session.get(Uzivatel, uzivatel_id)
        jmeno_odesilatele = odesilatel.profil.jmeno if odesilatel and odesilatel.profil else (
            odesilatel.email if odesilatel else "Uzivatel"
        )

        for ucastnik in chat.ucastnici:
            if ucastnik.id == uzivatel_id:
                continue

            if chat.jizda_id:
                zprava_oznameni = (
                    f"Nova zprava od {jmeno_odesilatele} v chatu jizdy {chat.jizda.odkud} -> {chat.jizda.kam}"
                )
            else:
                zprava_oznameni = f"Nova zprava od {jmeno_odesilatele}"

            vytvorit_oznameni(
                ucastnik.id,
                zprava_oznameni,
                "chat",
                kategorie="zpravy",
                odesilatel_id=uzivatel_id,
                target_path=f"/chat/{uzivatel_id}",
                jizda_id=chat.jizda_id,
            )

        return jsonify({"message": "Zprava odeslana", "zprava": zprava.to_dict()}), 201
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri odesilani zpravy", 500)


@chat_bp.route("/<int:chat_id>/zpravy", methods=["GET"])
@jwt_required()
def get_zpravy(chat_id):
    uzivatel_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    if page is None or page <= 0:
        return error_response("Parametr page musi byt kladne cele cislo")
    if per_page is None or per_page <= 0:
        return error_response("Parametr per_page musi byt kladne cele cislo")

    chat = db.session.get(Chat, chat_id)
    if not chat:
        return error_response("Chat nenalezen", 404)
    if not chat.muze_pristupovat(uzivatel_id):
        return error_response("Nemate pristup k tomuto chatu", 403)

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
    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    if not uzivatel:
        return error_response("Uzivatel nenalezen", 404)

    chaty_jizd = [chat for chat in uzivatel.chaty if chat.jizda_id is not None]
    osobni_chaty = [chat for chat in uzivatel.chaty if chat.jizda_id is None]
    return jsonify(
        {
            "chaty_jizd": [
                {
                    **chat.to_dict(),
                    "ucastnici": serialize_ucastnici(chat),
                    "posledni_zprava": get_posledni_zprava(chat),
                }
                for chat in chaty_jizd
            ],
            "osobni_chaty": [
                {
                    **chat.to_dict(),
                    "ucastnici": serialize_ucastnici(chat),
                    "posledni_zprava": get_posledni_zprava(chat),
                }
                for chat in osobni_chaty
            ],
        }
    )


@chat_bp.route("/zprava/<int:zprava_id>", methods=["DELETE"])
@jwt_required()
def smazat_zpravu(zprava_id):
    uzivatel_id = int(get_jwt_identity())
    zprava = db.session.get(Zprava, zprava_id)
    if not zprava:
        return error_response("Zprava nenalezena", 404)
    if zprava.odesilatel_id != uzivatel_id:
        return error_response("Nemate opravneni smazat tuto zpravu", 403)

    try:
        db.session.delete(zprava)
        db.session.commit()
        return jsonify({"message": "Zprava smazana"})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri mazani zpravy", 500)


@chat_bp.route("/osobni/<int:chat_id>", methods=["DELETE"])
@jwt_required()
def delete_osobni_chat(chat_id):
    uzivatel_id = int(get_jwt_identity())
    chat = db.session.get(Chat, chat_id)
    if not chat:
        return error_response("Chat nenalezen", 404)

    if chat.jizda_id is not None or uzivatel_id not in [user.id for user in chat.ucastnici]:
        return error_response("Nepovoleny pristup", 403)

    try:
        Zprava.query.filter_by(chat_id=chat.id).delete()
        db.session.delete(chat)
        db.session.commit()
        return jsonify({"message": "Chat byl smazan"}), 200
    except Exception:
        db.session.rollback()
        return error_response("Nepodarilo se smazat chat", 500)
