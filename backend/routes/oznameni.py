from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.oznameni import Oznameni
from utils.notifications import serialize_notification

oznameni_bp = Blueprint("oznameni", __name__)


@oznameni_bp.route("/", methods=["GET"])
@jwt_required()
def ziskat_oznameni():
    uzivatel_id = int(get_jwt_identity())
    oznameni = (
        Oznameni.query.filter_by(prijemce_id=uzivatel_id)
        .order_by(Oznameni.datum.desc())
        .all()
    )
    return jsonify([serialize_notification(item) for item in oznameni])


@oznameni_bp.route("/<int:oznameni_id>/precist", methods=["POST"])
@jwt_required()
def oznacit_prectene(oznameni_id):
    oznameni = Oznameni.query.get_or_404(oznameni_id)
    current_user_id = int(get_jwt_identity())

    if oznameni.prijemce_id != current_user_id:
        return jsonify({"msg": "Pristup odepren"}), 403

    oznameni.precteno = True
    db.session.commit()
    return jsonify({"msg": "Oznameni oznaceno jako prectene"})


@oznameni_bp.route("/poslat", methods=["POST"])
@jwt_required()
def poslat_oznameni():
    data = request.get_json() or {}
    current_user_id = int(get_jwt_identity())

    if not data.get("prijemce_id") or not data.get("zprava"):
        return jsonify({"msg": "Chybi povinne udaje"}), 400

    try:
        nove_oznameni = Oznameni(
            prijemce_id=data["prijemce_id"],
            odesilatel_id=current_user_id,
            zprava=data["zprava"],
            typ=data.get("typ"),
            kategorie=data.get("kategorie"),
            target_path=data.get("target_path"),
            jizda_id=data.get("jizda_id"),
            rezervace_id=data.get("rezervace_id"),
            cilovy_uzivatel_id=data.get("cilovy_uzivatel_id"),
            unikatni_klic=data.get("unikatni_klic"),
            precteno=False,
        )

        db.session.add(nove_oznameni)
        db.session.commit()

        return (
            jsonify(
                {
                    "msg": "Oznameni bylo odeslano",
                    "oznameni_id": nove_oznameni.id,
                    "oznameni": serialize_notification(nove_oznameni),
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Chyba pri odesilani oznameni: {e}"}), 500


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
