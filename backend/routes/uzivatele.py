from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.blokace import Blokace
from models.profil import Profil
from models.uzivatel import Uzivatel

uzivatele_bp = Blueprint("uzivatele", __name__)


@uzivatele_bp.route("/profil", methods=["GET"])
@jwt_required()
def get_muj_profil():
    """Získání vlastního profilu"""
    uzivatel_id = int(get_jwt_identity())
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    return jsonify({"uzivatel": uzivatel.to_dict()})


@uzivatele_bp.route("/profil", methods=["PUT"])
@jwt_required()
def update_profil():
    """Aktualizace vlastního profilu"""
    uzivatel_id = int(get_jwt_identity())
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    if not uzivatel.profil:
        return jsonify({"error": "Profil nenalezen"}), 404

    data = request.get_json()

    try:
        # Aktualizace profilu
        if "jmeno" in data:
            uzivatel.profil.jmeno = data["jmeno"]
        if "bio" in data:
            uzivatel.profil.bio = data["bio"]
        if "fotka" in data:
            uzivatel.profil.fotka = data["fotka"]

        db.session.commit()

        return jsonify(
            {"message": "Profil úspěšně aktualizován", "uzivatel": uzivatel.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci profilu"}), 500


@uzivatele_bp.route("/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def get_uzivatel_profil(uzivatel_id):
    """Získání profilu jiného uživatele"""
    current_user_id = int(get_jwt_identity())

    # Kontrola, zda uživatel není blokován
    blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()

    if blokace:
        return jsonify({"error": "Uživatel je blokován"}), 403

    # Kontrola, zda aktuální uživatel není blokován tímto uživatelem
    blokace_opacne = Blokace.query.filter_by(
        blokujici_id=uzivatel_id, blokovany_id=current_user_id
    ).first()

    if blokace_opacne:
        return jsonify({"error": "Nemáte přístup k tomuto profilu"}), 403

    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    # Omezený profil pro cizí uživatele
    profil_data = uzivatel.to_dict()
    if uzivatel.profil:
        profil_data["profil"]["email"] = None  # Skrytí emailu

    return jsonify({"uzivatel": profil_data})


@uzivatele_bp.route("/hledat", methods=["GET"])
@jwt_required()
def hledat_uzivatele():
    """Vyhledávání uživatelů podle jména"""
    query = request.args.get("q", "")
    print('cau')
    if len(query) < 2:
        return jsonify({"error": "Vyhledávací dotaz musí mít alespoň 2 znaky"}), 400

    current_user_id = int(get_jwt_identity())

    # Vyhledání uživatelů podle jména
    uzivatele = (
        db.session.query(Uzivatel)
        .join(Profil)
        .filter(Profil.jmeno.ilike(f"%{query}%"), Uzivatel.id != current_user_id)
        .limit(20)
        .all()
    )

    # Vyfiltrování blokovaných uživatelů
    blokace = (
        db.session.query(Blokace.blokovany_id)
        .filter_by(blokujici_id=current_user_id)
        .subquery()
    )

    uzivatele = [u for u in uzivatele if u.id not in [b.blokovany_id for b in blokace]]

    # Omezené informace pro vyhledávání
    vysledky = []
    for uzivatel in uzivatele:
        if uzivatel.profil:
            vysledky.append(
                {
                    "id": uzivatel.id,
                    "jmeno": uzivatel.profil.jmeno,
                    "fotka": uzivatel.profil.fotka,
                    "hodnoceni_ridic": uzivatel.profil.get_prumerne_hodnoceni("ridic"),
                    "hodnoceni_pasazer": uzivatel.profil.get_prumerne_hodnoceni(
                        "pasazer"
                    ),
                }
            )

    return jsonify({"uzivatele": vysledky, "celkem": len(vysledky)})


@uzivatele_bp.route("/<int:uzivatel_id>/blokovat", methods=["POST"])
@jwt_required()
def blokovat_uzivatele(uzivatel_id):
    """Blokování uživatele"""
    current_user_id = int(get_jwt_identity())

    if current_user_id == uzivatel_id:
        return jsonify({"error": "Nemůžete blokovat sebe sama"}), 400

    # Ověření existence uživatele
    uzivatel = Uzivatel.query.get_or_404(uzivatel_id)

    # Kontrola, zda už není blokován
    existujici_blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()

    if existujici_blokace:
        return jsonify({"error": "Uživatel je již blokován"}), 400

    try:
        blokace = Blokace(blokujici_id=current_user_id, blokovany_id=uzivatel_id)

        db.session.add(blokace)
        db.session.commit()

        return jsonify({"message": "Uživatel úspěšně blokován"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při blokování uživatele"}), 500


@uzivatele_bp.route("/<int:uzivatel_id>/odblokovat", methods=["DELETE"])
@jwt_required()
def odblokovat_uzivatele(uzivatel_id):
    """Odblokování uživatele"""
    current_user_id = int(get_jwt_identity())

    blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first_or_404()

    try:
        db.session.delete(blokace)
        db.session.commit()

        return jsonify({"message": "Uživatel úspěšně odblokován"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při odblokování uživatele"}), 500


@uzivatele_bp.route("/blokovani", methods=["GET"])
@jwt_required()
def get_blokovani_uzivatele():
    """Získání seznamu blokovaných uživatelů"""
    current_user_id = int(get_jwt_identity())

    blokace = (
        db.session.query(Blokace)
        .filter_by(blokujici_id=current_user_id)
        .join(Uzivatel, Blokace.blokovany_id == Uzivatel.id)
        .join(Profil)
        .all()
    )

    blokovani = []
    for b in blokace:
        uzivatel = Uzivatel.query.get(b.blokovany_id)
        if uzivatel and uzivatel.profil:
            blokovani.append(
                {
                    "id": uzivatel.id,
                    "jmeno": uzivatel.profil.jmeno,
                    "fotka": uzivatel.profil.fotka,
                }
            )

    return jsonify({"blokovani_uzivatele": blokovani})
