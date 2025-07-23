from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.auto import Auto
from models.uzivatel import Uzivatel
from utils.validators import validate_spz

auta_bp = Blueprint("auta", __name__)


@auta_bp.route("/", methods=["GET"])
@jwt_required()
def get_auta():
    """Získání aut aktuálního uživatele"""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    if not uzivatel.profil:
        return jsonify({"auta": []})

    auta = Auto.query.filter_by(profil_id=uzivatel.profil.id).all()

    return jsonify({"auta": [auto.to_dict() for auto in auta]})


@auta_bp.route("/", methods=["POST"])
@jwt_required()
def create_auto():
    """Vytvoření nového auta"""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    if not uzivatel.profil:
        return jsonify({"error": "Profil nenalezen"}), 404

    data = request.get_json()

    if not data or not data.get("znacka") or not data.get("model"):
        return jsonify({"error": "Značka a model jsou povinné"}), 400

    # Validace SPZ
    if data.get("spz") and not validate_spz(data["spz"]):
        return jsonify({"error": "Neplatný formát SPZ"}), 400

    try:
        auto = Auto(
            profil_id=uzivatel.profil.id,
            znacka=data["znacka"],
            model=data["model"],
            barva=data.get("barva"),
            spz=data.get("spz"),
            primarni=data.get("primarni", False),
            docasne=data.get("docasne", False),
        )

        # Pokud je auto nastaveno jako primární, zruší primární u ostatních
        if auto.primarni:
            Auto.query.filter_by(profil_id=uzivatel.profil.id, primarni=True).update(
                {"primarni": False}
            )

        db.session.add(auto)
        db.session.commit()

        return jsonify({"message": "Auto úspěšně přidáno", "auto": auto.to_dict()}), 201

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření auta"}), 500


@auta_bp.route("/<int:auto_id>", methods=["PUT"])
@jwt_required()
def update_auto(auto_id):
    """Aktualizace auta"""
    uzivatel_id = get_jwt_identity()
    auto = Auto.query.filter_by(id=auto_id, uzivatel_id=uzivatel_id).first_or_404()

    data = request.get_json()

    # Validace SPZ
    if data.get("spz") and not validate_spz(data["spz"]):
        return jsonify({"error": "Neplatný formát SPZ"}), 400

    try:
        # Aktualizace polí
        if "znacka" in data:
            auto.znacka = data["znacka"]
        if "model" in data:
            auto.model = data["model"]
        if "barva" in data:
            auto.barva = data["barva"]
        if "spz" in data:
            auto.spz = data["spz"]
        if "primarni" in data:
            auto.primarni = data["primarni"]
            # Pokud je auto nastaveno jako primární, zruší primární u ostatních
            if auto.primarni:
                Auto.query.filter(
                    Auto.uzivatel_id == uzivatel_id,
                    Auto.id != auto_id,
                    Auto.primarni == True,
                ).update({"primarni": False})
        if "docasne" in data:
            auto.docasne = data["docasne"]

        db.session.commit()

        return jsonify(
            {"message": "Auto úspěšně aktualizováno", "auto": auto.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci auta"}), 500


@auta_bp.route("/<int:auto_id>", methods=["DELETE"])
@jwt_required()
def delete_auto(auto_id):
    """Smazání auta"""
    uzivatel_id = get_jwt_identity()
    auto = Auto.query.filter_by(id=auto_id, uzivatel_id=uzivatel_id).first_or_404()

    # Kontrola, zda auto není použito v aktivních jízdách
    if auto.jizdy:
        aktivni_jizdy = [j for j in auto.jizdy if j.status == "aktivni"]
        if aktivni_jizdy:
            return jsonify({"error": "Auto nemůže být smazáno, má aktivní jízdy"}), 400

    try:
        db.session.delete(auto)
        db.session.commit()

        return jsonify({"message": "Auto úspěšně smazáno"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při mazání auta"}), 500


@auta_bp.route("/<int:auto_id>/nastavit-primarni", methods=["POST"])
@jwt_required()
def nastavit_primarni(auto_id):
    """Nastavení auta jako primární"""
    uzivatel_id = get_jwt_identity()
    auto = Auto.query.filter_by(id=auto_id, uzivatel_id=uzivatel_id).first_or_404()

    try:
        # Zruší primární u všech ostatních aut
        Auto.query.filter_by(uzivatel_id=uzivatel_id, primarni=True).update(
            {"primarni": False}
        )

        # Nastaví toto auto jako primární
        auto.primarni = True
        db.session.commit()

        return jsonify(
            {"message": "Auto nastaveno jako primární", "auto": auto.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při nastavování primárního auta"}), 500
