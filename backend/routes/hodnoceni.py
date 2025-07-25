from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.hodnoceni import Hodnoceni
from models.jizda import Jizda
from models.uzivatel import Uzivatel

hodnoceni_bp = Blueprint("hodnoceni", __name__)


@hodnoceni_bp.route("/", methods=["POST"])
@jwt_required()
def create_hodnoceni():
    """Vytvoření nového hodnocení"""
    autor_id = int(get_jwt_identity())
    data = request.get_json()

    required_fields = ["cilovy_uzivatel_id", "role", "znamka"]
    for field in required_fields:
        if not data or field not in data:
            return jsonify({"error": f"Pole {field} je povinné"}), 400

    cilovy_uzivatel_id = data["cilovy_uzivatel_id"]
    role = data["role"]
    znamka = data["znamka"]
    komentar = data.get("komentar", "")

    # Validace
    if autor_id == cilovy_uzivatel_id:
        return jsonify({"error": "Nemůžete hodnotit sebe sama"}), 400

    if role not in ["ridic", "pasazer"]:
        return jsonify({"error": 'Role musí být "ridic" nebo "pasazer"'}), 400

    if not isinstance(znamka, int) or znamka < 1 or znamka > 5:
        return jsonify({"error": "Známka musí být číslo od 1 do 5"}), 400

    # Ověření existence cílového uživatele
    cilovy_uzivatel = Uzivatel.query.get(cilovy_uzivatel_id)
    if not cilovy_uzivatel:
        return jsonify({"error": "Cílový uživatel nenalezen"}), 404

    # TODO: Kontrola, zda spolu uživatelé jeli (pro produkci)
    # Prozatím umožníme hodnotit kohokoliv

    # Kontrola, zda už neexistuje hodnocení pro danou kombinaci
    existujici = Hodnoceni.query.filter_by(
        autor_id=autor_id, cilovy_uzivatel_id=cilovy_uzivatel_id, role=role
    ).first()

    if existujici:
        return jsonify(
            {"error": f"Již jste hodnotil tohoto uživatele jako {role}"}
        ), 400

    try:
        hodnoceni = Hodnoceni(
            autor_id=autor_id,
            cilovy_uzivatel_id=cilovy_uzivatel_id,
            role=role,
            znamka=znamka,
            komentar=komentar,
        )

        db.session.add(hodnoceni)
        db.session.commit()

        return jsonify(
            {"message": "Hodnocení úspěšně přidáno", "hodnoceni": hodnoceni.to_dict()}
        ), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření hodnocení"}), 500


@hodnoceni_bp.route("/uzivatel/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def get_hodnoceni_uzivatele(uzivatel_id):
    """Získání hodnocení konkrétního uživatele"""
    role = request.args.get("role")  # 'ridic' nebo 'pasazer'

    # Ověření existence uživatele
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    # Základní query
    query = Hodnoceni.query.filter_by(cilovy_uzivatel_id=uzivatel_id)

    # Filtrování podle role
    if role and role in ["ridic", "pasazer"]:
        query = query.filter_by(role=role)

    hodnoceni = query.order_by(Hodnoceni.datum.desc()).all()

    # Statistiky
    celkem = len(hodnoceni)
    prumer = sum(h.znamka for h in hodnoceni) / celkem if celkem > 0 else 0

    # Rozdělení podle známek
    rozdeleni = {str(i): 0 for i in range(1, 6)}
    for h in hodnoceni:
        rozdeleni[str(h.znamka)] += 1

    return jsonify(
        {
            "hodnoceni": [h.to_dict() for h in hodnoceni],
            "statistiky": {
                "celkem": celkem,
                "prumer": round(prumer, 2),
                "rozdeleni": rozdeleni,
            },
        }
    )


@hodnoceni_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_hodnoceni():
    """Získání hodnocení aktuálního uživatele"""
    uzivatel_id = int(get_jwt_identity())

    # Hodnocení, která jsem dostal
    dostana = (
        Hodnoceni.query.filter_by(cilovy_uzivatel_id=uzivatel_id)
        .order_by(Hodnoceni.datum.desc())
        .all()
    )

    # Hodnocení, která jsem dal
    dana = (
        Hodnoceni.query.filter_by(autor_id=uzivatel_id)
        .order_by(Hodnoceni.datum.desc())
        .all()
    )

    return jsonify(
        {
            "dostana_hodnoceni": [h.to_dict() for h in dostana],
            "dana_hodnoceni": [h.to_dict() for h in dana],
        }
    )


@hodnoceni_bp.route("/<int:hodnoceni_id>", methods=["PUT"])
@jwt_required()
def update_hodnoceni(hodnoceni_id):
    """Aktualizace hodnocení (pouze autorem)"""
    uzivatel_id = int(get_jwt_identity())
    hodnoceni = Hodnoceni.query.get_or_404(hodnoceni_id)

    # Pouze autor může upravovat své hodnocení
    if hodnoceni.autor_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat toto hodnocení"}), 403

    data = request.get_json()

    try:
        # Aktualizace polí
        if "znamka" in data:
            znamka = data["znamka"]
            if not isinstance(znamka, int) or znamka < 1 or znamka > 5:
                return jsonify({"error": "Známka musí být číslo od 1 do 5"}), 400
            hodnoceni.znamka = znamka

        if "komentar" in data:
            hodnoceni.komentar = data["komentar"]

        db.session.commit()

        return jsonify(
            {
                "message": "Hodnocení úspěšně aktualizováno",
                "hodnoceni": hodnoceni.to_dict(),
            }
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci hodnocení"}), 500


@hodnoceni_bp.route("/<int:hodnoceni_id>", methods=["DELETE"])
@jwt_required()
def delete_hodnoceni(hodnoceni_id):
    """Smazání hodnocení (pouze autorem)"""
    uzivatel_id = int(get_jwt_identity())
    hodnoceni = Hodnoceni.query.get_or_404(hodnoceni_id)

    # Pouze autor může smazat své hodnocení
    if hodnoceni.autor_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění smazat toto hodnocení"}), 403

    try:
        db.session.delete(hodnoceni)
        db.session.commit()

        return jsonify({"message": "Hodnocení úspěšně smazáno"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při mazání hodnocení"}), 500
