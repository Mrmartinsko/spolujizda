from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.blokace import Blokace
from models.uzivatel import Uzivatel

blokace_bp = Blueprint("blokace", __name__)


@blokace_bp.route("/", methods=["GET"])
@jwt_required()
def get_blokovane_uzivatele():
    """Získání seznamu blokovaných uživatelů"""
    uzivatel_id = get_jwt_identity()

    # Získání všech blokací aktuálního uživatele
    blokace = db.session.query(Blokace).filter_by(blokujici_id=uzivatel_id).all()

    blokovani_uzivatele = []
    for b in blokace:
        uzivatel = Uzivatel.query.get(b.blokovany_id)
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
    """Blokování uživatele"""
    blokujici_id = get_jwt_identity()

    if blokujici_id == blokovany_id:
        return jsonify({"error": "Nemůžete blokovat sebe sama"}), 400

    # Ověření existence blokovaného uživatele
    blokovany_uzivatel = Uzivatel.query.get_or_404(blokovany_id)

    # Kontrola, zda už není blokován
    existujici_blokace = Blokace.query.filter_by(
        blokujici_id=blokujici_id, blokovany_id=blokovany_id
    ).first()

    if existujici_blokace:
        return jsonify({"error": "Uživatel je již blokován"}), 400

    try:
        blokace = Blokace(blokujici_id=blokujici_id, blokovany_id=blokovany_id)

        db.session.add(blokace)
        db.session.commit()

        return jsonify(
            {"message": "Uživatel úspěšně blokován", "blokace": blokace.to_dict()}
        ), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při blokování uživatele"}), 500


@blokace_bp.route("/<int:blokovany_id>", methods=["DELETE"])
@jwt_required()
def odblokovat_uzivatele(blokovany_id):
    """Odblokování uživatele"""
    blokujici_id = get_jwt_identity()

    # Nalezení blokace
    blokace = Blokace.query.filter_by(
        blokujici_id=blokujici_id, blokovany_id=blokovany_id
    ).first_or_404()

    try:
        db.session.delete(blokace)
        db.session.commit()

        return jsonify({"message": "Uživatel úspěšně odblokován"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při odblokování uživatele"}), 500


@blokace_bp.route("/kontrola/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def kontrola_blokace(uzivatel_id):
    """Kontrola, zda je uživatel blokován"""
    current_user_id = get_jwt_identity()

    # Kontrola, zda aktuální uživatel blokuje daného uživatele
    blokace_ja = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()

    # Kontrola, zda daný uživatel blokuje aktuálního uživatele
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
