from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.jizda import Jizda
from models.rezervace import Rezervace
from models.uzivatel import Uzivatel

rezervace_bp = Blueprint("rezervace", __name__)


@rezervace_bp.route("/", methods=["POST"])
@jwt_required()
def create_rezervace():
    """Vytvoření nové rezervace"""
    uzivatel_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or "jizda_id" not in data:
        return jsonify({"error": "ID jízdy je povinné"}), 400

    jizda_id = data["jizda_id"]
    poznamka = data.get("poznamka", "")

    # Ověření existence jízdy
    jizda = Jizda.query.get(jizda_id)
    if not jizda:
        return jsonify({"error": "Jízda nenalezena"}), 404

    # Kontrola, zda může uživatel rezervovat
    muze, zprava = jizda.muze_rezervovat(uzivatel_id)
    if not muze:
        return jsonify({"error": zprava}), 400

    # Kontrola, zda už neexistuje aktivní rezervace
    existujici = (
        Rezervace.query.filter_by(uzivatel_id=uzivatel_id, jizda_id=jizda_id)
        .filter(Rezervace.status.in_(["cekajici", "prijata"]))
        .first()
    )

    if existujici:
        return jsonify({"error": "Již máte aktivní rezervaci na tuto jízdu"}), 400

    try:
        rezervace = Rezervace(
            uzivatel_id=uzivatel_id, jizda_id=jizda_id, poznamka=poznamka
        )

        db.session.add(rezervace)
        db.session.commit()

        return jsonify(
            {"message": "Rezervace úspěšně vytvořena", "rezervace": rezervace.to_dict()}
        ), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/prijmout", methods=["POST"])
@jwt_required()
def prijmout_rezervaci(rezervace_id):
    """Přijetí rezervace (pouze řidič)"""
    uzivatel_id = int(get_jwt_identity())

    rezervace = Rezervace.query.get_or_404(rezervace_id)

    # Pouze řidič může přijímat rezervace
    if rezervace.jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění přijmout tuto rezervaci"}), 403

    if rezervace.status != "cekajici":
        return jsonify({"error": "Rezervace již byla zpracována"}), 400

    try:
        # Použijeme metodu prijmout() z modelu, která přidá uživatele mezi pasažéry
        rezervace.prijmout()
        db.session.commit()

        return jsonify(
            {"message": "Rezervace přijata", "rezervace": rezervace.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při přijímání rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/odmitnout", methods=["POST"])
@jwt_required()
def odmitnout_rezervaci(rezervace_id):
    """Odmítnutí rezervace (pouze řidič)"""
    uzivatel_id = int(get_jwt_identity())

    rezervace = Rezervace.query.get_or_404(rezervace_id)

    # Pouze řidič může odmítat rezervace
    if rezervace.jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění odmítnout tuto rezervaci"}), 403

    if rezervace.status != "cekajici":
        return jsonify({"error": "Rezervace již byla zpracována"}), 400

    try:
        # Použijeme metodu odmitnout() z modelu
        rezervace.odmitnout()
        db.session.commit()

        return jsonify(
            {"message": "Rezervace odmítnuta", "rezervace": rezervace.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při odmítání rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/zrusit", methods=["DELETE"])
@jwt_required()
def zrusit_rezervaci(rezervace_id):
    """Zrušení rezervace (uživatel nebo řidič)"""
    uzivatel_id = int(get_jwt_identity())

    rezervace = Rezervace.query.get_or_404(rezervace_id)

    # Pouze uživatel, který rezervaci vytvořil, nebo řidič může zrušit
    if rezervace.uzivatel_id != uzivatel_id and rezervace.jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zrušit tuto rezervaci"}), 403

    try:
        # Použijeme metodu zrusit() z modelu, která odebere uživatele z pasažérů
        rezervace.zrusit()
        db.session.commit()

        return jsonify({"message": "Rezervace zrušena"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při rušení rezervace"}), 500


@rezervace_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_rezervace():
    """Získání rezervací aktuálního uživatele"""
    uzivatel_id = int(get_jwt_identity())

    # Rezervace, které jsem odeslal
    moje_rezervace = Rezervace.query.filter_by(uzivatel_id=uzivatel_id).all()

    # Rezervace na moje jízdy (jako řidič)
    moje_jizdy = Jizda.query.filter_by(ridic_id=uzivatel_id).all()
    rezervace_na_moje_jizdy = []
    for jizda in moje_jizdy:
        rezervace_jizdy = Rezervace.query.filter_by(jizda_id=jizda.id).all()
        rezervace_na_moje_jizdy.extend(rezervace_jizdy)

    # Kombinace a označení typu
    vysledek = []

    # Přidání odeslaných rezervací
    for rezervace in moje_rezervace:
        data = rezervace.to_dict()
        data["typ"] = "odeslana"
        vysledek.append(data)

    # Přidání přijatých rezervací na moje jízdy
    for rezervace in rezervace_na_moje_jizdy:
        data = rezervace.to_dict()
        data["typ"] = "prijata"
        vysledek.append(data)

    return jsonify(vysledek)


@rezervace_bp.route("/jizda/<int:jizda_id>", methods=["GET"])
@jwt_required()
def get_rezervace_jizdy(jizda_id):
    """Získání rezervací pro konkrétní jízdu (pouze pro řidiče)"""
    uzivatel_id = int(get_jwt_identity())

    jizda = Jizda.query.get_or_404(jizda_id)

    # Pouze řidič může vidět rezervace své jízdy
    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zobrazit rezervace této jízdy"}), 403

    rezervace = Rezervace.query.filter_by(jizda_id=jizda_id).all()

    return jsonify({"rezervace": [r.to_dict() for r in rezervace]})
