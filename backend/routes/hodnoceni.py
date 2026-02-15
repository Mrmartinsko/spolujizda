from datetime import datetime

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
    """Vytvoření nového hodnocení (jen po dokončení jízdy a jen účastníci)."""
    autor_id = int(get_jwt_identity())
    data = request.get_json() or {}

    required_fields = ["jizda_id", "cilovy_uzivatel_id", "role", "znamka"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Pole {field} je povinné"}), 400

    jizda_id = data["jizda_id"]
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

    # Jízda musí existovat
    jizda = Jizda.query.get(jizda_id)
    if not jizda:
        return jsonify({"error": "Jízda nenalezena"}), 404

    # "hned po dojetí" - líně přepni status podle času
    now = datetime.now()
    if jizda.status == "aktivni" and jizda.cas_prijezdu and jizda.cas_prijezdu <= now:
        jizda.status = "dokoncena"
        db.session.commit()

    if jizda.status != "dokoncena":
        return jsonify({"error": "Hodnotit lze až po dokončení jízdy"}), 400

    # Ověření existence cílového uživatele
    cilovy_uzivatel = Uzivatel.query.get(cilovy_uzivatel_id)
    if not cilovy_uzivatel:
        return jsonify({"error": "Cílový uživatel nenalezen"}), 404

    # Účastníci jízdy
    autor_is_driver = (autor_id == jizda.ridic_id)
    autor_is_passenger = any(p.id == autor_id for p in jizda.pasazeri)

    target_is_driver = (cilovy_uzivatel_id == jizda.ridic_id)
    target_is_passenger = any(p.id == cilovy_uzivatel_id for p in jizda.pasazeri)

    if not (autor_is_driver or autor_is_passenger):
        return jsonify({"error": "Tuto jízdu jste nejel"}), 403

    if not (target_is_driver or target_is_passenger):
        return jsonify({"error": "Cílový uživatel nebyl účastníkem této jízdy"}), 400

    # Pravidla podle role
    if role == "ridic":
        # řidiče může hodnotit pouze pasažér, a cílový musí být řidič té jízdy
        if not autor_is_passenger or not target_is_driver:
            return jsonify({"error": "Řidiče může hodnotit pouze pasažér z této jízdy"}), 400
    else:  # pasazer
        # pasažéra může hodnotit pouze řidič, a cílový musí být pasažér té jízdy
        if not autor_is_driver or not target_is_passenger:
            return jsonify({"error": "Pasažéra může hodnotit pouze řidič z této jízdy"}), 400

    # Kontrola duplicity (v rámci konkrétní jízdy)
    existujici = Hodnoceni.query.filter_by(
        autor_id=autor_id,
        cilovy_uzivatel_id=cilovy_uzivatel_id,
        jizda_id=jizda_id,
        role=role,
    ).first()

    if existujici:
        return jsonify({"error": "Hodnocení pro tuto jízdu už existuje"}), 400

    try:
        hodnoceni = Hodnoceni(
            autor_id=autor_id,
            cilovy_uzivatel_id=cilovy_uzivatel_id,
            jizda_id=jizda_id,
            role=role,
            znamka=znamka,
            komentar=komentar,
        )

        db.session.add(hodnoceni)
        db.session.commit()

        return jsonify(
            {"message": "Hodnocení úspěšně přidáno", "hodnoceni": hodnoceni.to_dict()}
        ), 201

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření hodnocení"}), 500


@hodnoceni_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_hodnoceni():
    """Vrátí dokončené jízdy, kde aktuální uživatel (pasažér) ještě neohodnotil řidiče."""
    uzivatel_id = int(get_jwt_identity())
    now = datetime.now()

    jizdy = (
        Jizda.query.join(Jizda.pasazeri)
        .filter(Uzivatel.id == uzivatel_id)
        .all()
    )

    pending = []
    changed = False

    for j in jizdy:
        if j.status == "aktivni" and j.cas_prijezdu and j.cas_prijezdu <= now:
            j.status = "dokoncena"
            changed = True

        if j.status != "dokoncena":
            continue

        exist = Hodnoceni.query.filter_by(
            autor_id=uzivatel_id,
            cilovy_uzivatel_id=j.ridic_id,
            jizda_id=j.id,
            role="ridic",
        ).first()

        if not exist:
            pending.append(
                {
                    "jizda_id": j.id,
                    "jizda": j.to_dict(),
                    "cilovy_uzivatel_id": j.ridic_id,
                    "role": "ridic",
                }
            )

    if changed:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    return jsonify({"pending": pending})


@hodnoceni_bp.route("/uzivatel/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def get_hodnoceni_uzivatele(uzivatel_id):
    """Získání hodnocení konkrétního uživatele"""
    role = request.args.get("role")  # 'ridic' nebo 'pasazer'

    Uzivatel.query.get_or_404(uzivatel_id)

    query = Hodnoceni.query.filter_by(cilovy_uzivatel_id=uzivatel_id)

    if role and role in ["ridic", "pasazer"]:
        query = query.filter_by(role=role)

    hodnoceni = query.order_by(Hodnoceni.datum.desc()).all()

    celkem = len(hodnoceni)
    prumer = sum(h.znamka for h in hodnoceni) / celkem if celkem > 0 else 0

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

    dostana = (
        Hodnoceni.query.filter_by(cilovy_uzivatel_id=uzivatel_id)
        .order_by(Hodnoceni.datum.desc())
        .all()
    )

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

    if hodnoceni.autor_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat toto hodnocení"}), 403

    data = request.get_json() or {}

    try:
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

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci hodnocení"}), 500


@hodnoceni_bp.route("/<int:hodnoceni_id>", methods=["DELETE"])
@jwt_required()
def delete_hodnoceni(hodnoceni_id):
    """Smazání hodnocení (pouze autorem)"""
    uzivatel_id = int(get_jwt_identity())
    hodnoceni = Hodnoceni.query.get_or_404(hodnoceni_id)

    if hodnoceni.autor_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění smazat toto hodnocení"}), 403

    try:
        db.session.delete(hodnoceni)
        db.session.commit()
        return jsonify({"message": "Hodnocení úspěšně smazáno"})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při mazání hodnocení"}), 500
