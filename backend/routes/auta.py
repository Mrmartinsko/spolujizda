from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.auto import Auto
from models.uzivatel import Uzivatel
from utils.validators import validate_spz
from sqlalchemy import false
from models.jizda import Jizda

auta_bp = Blueprint("auta", __name__)

def get_uzivatel_a_profil():
    """Helper pro získání aktuálního uživatele a jeho profilu"""
    uzivatel_id = get_jwt_identity()
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)
    if not uzivatel.profil:
        return None, jsonify({"error": "Profil nenalezen"}), 404
    return uzivatel, None, None


@auta_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_auta():
    """Získání aut aktuálního uživatele"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auta = Auto.query.filter(
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false()
    ).order_by(Auto.primarni.desc()).all()

    return jsonify([auto.to_dict() for auto in auta])


@auta_bp.route("/moje-nove", methods=["POST"])
@jwt_required()
def create_auto():
    """Vytvoření nového auta"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    data = request.get_json()
    if not data or not data.get("znacka") or not data.get("model"):
        return jsonify({"error": "Značka a model jsou povinné"}), 400

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
            smazane=False
        )

        # Pokud je auto primární, zruší primární u ostatních
        if auto.primarni:
            Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.primarni == True
            ).update({"primarni": False})

        # Pokud uživatel nemá žádné primární auto, nastav nové jako primární
        ma_primarni = Auto.query.filter(
            Auto.profil_id == uzivatel.profil.id,
            Auto.primarni == True,
            Auto.smazane == false()
        ).first()
        if not auto.primarni and not ma_primarni:
            auto.primarni = True

        db.session.add(auto)
        db.session.commit()

        return jsonify({"message": "Auto úspěšně přidáno", "auto": auto.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Chyba při vytváření auta: {e}"}), 500


@auta_bp.route("/<int:auto_id>", methods=["PUT"])
@jwt_required()
def update_auto(auto_id):
    """Aktualizace auta"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false()
    ).first_or_404()
    data = request.get_json()

    if data.get("spz") and not validate_spz(data["spz"]):
        return jsonify({"error": "Neplatný formát SPZ"}), 400

    try:
        auto.znacka = data.get("znacka", auto.znacka)
        auto.model = data.get("model", auto.model)
        auto.barva = data.get("barva", auto.barva)
        auto.spz = data.get("spz", auto.spz)
        auto.docasne = data.get("docasne", auto.docasne)
        auto.primarni = data.get("primarni", auto.primarni)

        if auto.primarni:
            # Zruší primární u ostatních
            Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.id != auto.id,
                Auto.primarni == True
            ).update({"primarni": False})

        db.session.commit()
        return jsonify({"message": "Auto úspěšně aktualizováno", "auto": auto.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Chyba při aktualizaci auta: {e}"}), 500


@auta_bp.route("/<int:auto_id>", methods=["DELETE"])
@jwt_required()
def delete_auto(auto_id):
    """Soft delete auta - auto se archivuje, jízdy zůstávají"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false()
    ).first_or_404()

    # Kontrola, zda má aktivní jízdy
    if auto.ma_aktivni_jizdy():
        print(f"Auto {auto.id} má aktivní jízdy!")  # DEBUG
        return jsonify({
            "error": "AUTO_MA_AKTIVNI_JIZDY",
            "message": "Toto auto má aktivní jízdy, je třeba jej nahradit"
        }), 409

    # Pokud nemá aktivní jízdy, pokračujeme v mazání
    bylo_primarni = auto.primarni

    try:
        auto.smazane = True
        auto.primarni = False

        if bylo_primarni:
            nove_primarni = Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.smazane == false()
            ).first()
            if nove_primarni:
                nove_primarni.primarni = True

        db.session.commit()
        return jsonify({"message": "Auto bylo úspěšně smazáno (archivováno)"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Chyba při mazání auta: {e}"}), 500



@auta_bp.route("/<int:auto_id>/nastavit-primarni", methods=["POST"])
@jwt_required()
def nastavit_primarni(auto_id):
    """Nastavení auta jako primární"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false()
    ).first_or_404()

    try:
        # Zruší primární u všech ostatních aut
        Auto.query.filter(
            Auto.profil_id == uzivatel.profil.id,
            Auto.primarni == True
        ).update({"primarni": False})

        auto.primarni = True
        db.session.commit()

        return jsonify({"message": "Auto nastaveno jako primární", "auto": auto.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Chyba při nastavování primárního auta: {e}"})

@auta_bp.route("/replace/<int:stare_auto_id>", methods=["POST"])
@jwt_required()
def replace_auto(stare_auto_id):
    """Nahrazení auta u aktivních jízd jiným autem a smazání starého auta"""
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    stare_auto = Auto.query.filter(
        Auto.id == stare_auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == False
    ).first_or_404()

    if not stare_auto.ma_aktivni_jizdy():
        return jsonify({
            "error": "AUTO_NEMA_AKTIVNI_JIZDY",
            "message": "Toto auto nemá žádné aktivní jízdy"
        }), 400

    data = request.get_json()
    nove_auto_id = data.get("nove_auto_id")
    if not nove_auto_id:
        return jsonify({
            "error": "NOVE_AUTO_CHYBI",
            "message": "Musíte zadat nové auto"
        }), 400

    nove_auto = Auto.query.filter(
        Auto.id == nove_auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == False
    ).first()

    if not nove_auto:
        return jsonify({
            "error": "NOVE_AUTO_NEEXISTUJE",
            "message": "Nové auto neexistuje nebo nepatří uživateli"
        }), 404

    try:
        # Přepsat auto u všech aktivních jízd
        aktivni_jizdy = Jizda.query.filter(
            Jizda.auto_id == stare_auto.id,
            Jizda.status == "aktivni"
        ).all()

        for j in aktivni_jizdy:
            j.auto_id = nove_auto.id

        # Označit staré auto jako smazané a zrušit primární
        bylo_primarni = stare_auto.primarni
        stare_auto.smazane = True
        stare_auto.primarni = False

        # Pokud bylo primární, vybrat nové primární auto
        if bylo_primarni:
            ma_primarni = Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.smazane == False,
                Auto.id != stare_auto.id
            ).first()
            if ma_primarni:
                ma_primarni.primarni = True

        db.session.commit()

        return jsonify({
            "message": f"Auto u {len(aktivni_jizdy)} aktivních jízd bylo nahrazeno a staré auto smazáno"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "CHYBA_PRI_NAHRAZE",
            "message": str(e)
        }), 500
