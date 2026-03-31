from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.blokace import Blokace
from models.uzivatel import Uzivatel
from utils.api import error_response

blokace_bp = Blueprint("blokace", __name__)


@blokace_bp.route("/", methods=["GET"])
@jwt_required()
def get_blokovane_uzivatele():
    uzivatel_id = int(get_jwt_identity())
    blokace = db.session.query(Blokace).filter_by(blokujici_id=uzivatel_id).all()

    blokovani_uzivatele = []
    for item in blokace:
        uzivatel = db.session.get(Uzivatel, item.blokovany_id)
        if uzivatel and uzivatel.profil:
            blokovani_uzivatele.append(
                {
                    "id": uzivatel.id,
                    "jmeno": uzivatel.profil.jmeno,
                    "fotka": uzivatel.profil.fotka,
                }
            )

    return jsonify(
        {"blokovani_uzivatele": blokovani_uzivatele, "celkem": len(blokovani_uzivatele)}
    )


@blokace_bp.route("/<int:blokovany_id>", methods=["POST"])
@jwt_required()
def blokovat_uzivatele(blokovany_id):
    blokujici_id = int(get_jwt_identity())
    if blokujici_id == blokovany_id:
        return error_response("Nemuzete blokovat sebe sama")
    if not db.session.get(Uzivatel, blokovany_id):
        return error_response("Uzivatel nenalezen", 404)

    existujici_blokace = Blokace.query.filter_by(
        blokujici_id=blokujici_id, blokovany_id=blokovany_id
    ).first()
    if existujici_blokace:
        return error_response("Uzivatel je jiz blokovan")

    try:
        blokace = Blokace(blokujici_id=blokujici_id, blokovany_id=blokovany_id)
        db.session.add(blokace)
        db.session.commit()
        return jsonify({"message": "Uzivatel uspesne blokovan", "blokace": blokace.to_dict()}), 201
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri blokovani uzivatele", 500)


@blokace_bp.route("/<int:blokovany_id>", methods=["DELETE"])
@jwt_required()
def odblokovat_uzivatele(blokovany_id):
    blokujici_id = int(get_jwt_identity())
    blokace = Blokace.query.filter_by(
        blokujici_id=blokujici_id, blokovany_id=blokovany_id
    ).first()
    if not blokace:
        return error_response("Blokace nenalezena", 404)

    try:
        db.session.delete(blokace)
        db.session.commit()
        return jsonify({"message": "Uzivatel uspesne odblokovan"})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri odblokovani uzivatele", 500)


@blokace_bp.route("/kontrola/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def kontrola_blokace(uzivatel_id):
    current_user_id = int(get_jwt_identity())
    blokace_ja = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()
    blokace_on = Blokace.query.filter_by(
        blokujici_id=uzivatel_id, blokovany_id=current_user_id
    ).first()

    return jsonify(
        {
            "ja_blokuji": blokace_ja is not None,
            "blokuje_me": blokace_on is not None,
            "muze_komunikovat": blokace_ja is None and blokace_on is None,
        }
    )
