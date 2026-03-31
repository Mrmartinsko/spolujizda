from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.oznameni import Oznameni
from utils.api import error_response, get_json_data, get_str_field, parse_positive_int
from utils.notifications import serialize_notification

oznameni_bp = Blueprint("oznameni", __name__)


@oznameni_bp.route("/", methods=["GET"])
@jwt_required()
def ziskat_oznameni():
    uzivatel_id = int(get_jwt_identity())
    oznameni = (
        Oznameni.query.filter_by(prijemce_id=uzivatel_id).order_by(Oznameni.datum.desc()).all()
    )
    return jsonify([serialize_notification(item) for item in oznameni])


@oznameni_bp.route("/<int:oznameni_id>/precist", methods=["POST"])
@jwt_required()
def oznacit_prectene(oznameni_id):
    oznameni = db.session.get(Oznameni, oznameni_id)
    if not oznameni:
        return error_response("Oznameni nenalezeno", 404)

    current_user_id = int(get_jwt_identity())
    if oznameni.prijemce_id != current_user_id:
        return error_response("Pristup odepren", 403)

    oznameni.precteno = True
    db.session.commit()
    return jsonify({"message": "Oznameni oznaceno jako prectene"})


@oznameni_bp.route("/poslat", methods=["POST"])
@jwt_required()
def poslat_oznameni():
    data, error = get_json_data()
    if error:
        return error

    current_user_id = int(get_jwt_identity())
    prijemce_id, recipient_error = parse_positive_int(data.get("prijemce_id"), "prijemce_id")
    if recipient_error:
        return error_response(recipient_error)

    zprava, message_error = get_str_field(data, "zprava", required=True, max_length=500)
    if message_error:
        return error_response(message_error)

    typ, type_error = get_str_field(data, "typ")
    if type_error:
        return error_response(type_error)
    kategorie, category_error = get_str_field(data, "kategorie")
    if category_error:
        return error_response(category_error)
    target_path, path_error = get_str_field(data, "target_path", max_length=255)
    if path_error:
        return error_response(path_error)
    unikatni_klic, key_error = get_str_field(data, "unikatni_klic", max_length=255)
    if key_error:
        return error_response(key_error)

    try:
        nove_oznameni = Oznameni(
            prijemce_id=prijemce_id,
            odesilatel_id=current_user_id,
            zprava=zprava,
            typ=typ,
            kategorie=kategorie,
            target_path=target_path,
            jizda_id=data.get("jizda_id"),
            rezervace_id=data.get("rezervace_id"),
            cilovy_uzivatel_id=data.get("cilovy_uzivatel_id"),
            unikatni_klic=unikatni_klic,
            precteno=False,
        )

        db.session.add(nove_oznameni)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Oznameni bylo odeslano",
                    "oznameni_id": nove_oznameni.id,
                    "oznameni": serialize_notification(nove_oznameni),
                }
            ),
            201,
        )
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri odesilani oznameni", 500)


@oznameni_bp.route("/neprectena", methods=["GET"])
@jwt_required()
def ziskat_neprectena():
    uzivatel_id = int(get_jwt_identity())
    oznameni = (
        Oznameni.query.filter_by(prijemce_id=uzivatel_id, precteno=False)
        .order_by(Oznameni.datum.desc())
        .all()
    )
    return jsonify([serialize_notification(item) for item in oznameni])
