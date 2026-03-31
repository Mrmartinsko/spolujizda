from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.blokace import Blokace
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.api import error_response, get_json_data, get_str_field

uzivatele_bp = Blueprint("uzivatele", __name__)


@uzivatele_bp.route("/profil", methods=["GET"])
@jwt_required()
def get_muj_profil():
    uzivatel_id = int(get_jwt_identity())
    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    if not uzivatel:
        return error_response("Uzivatel nenalezen", 404)
    return jsonify({"uzivatel": uzivatel.to_dict()})


@uzivatele_bp.route("/profil", methods=["PUT"])
@jwt_required()
def update_profil():
    uzivatel_id = int(get_jwt_identity())
    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    if not uzivatel:
        return error_response("Uzivatel nenalezen", 404)
    if not uzivatel.profil:
        return error_response("Profil nenalezen", 404)

    data, error = get_json_data()
    if error:
        return error

    try:
        if "jmeno" in data:
            jmeno, name_error = get_str_field(data, "jmeno", required=True, max_length=50)
            if name_error:
                return error_response(name_error)

            existing_profile = (
                Profil.query.filter(
                    db.func.lower(Profil.jmeno) == jmeno.lower(),
                    Profil.uzivatel_id != uzivatel_id,
                ).first()
            )
            if existing_profile:
                return error_response("Toto uzivatelske jmeno je jiz obsazene.", 409)
            uzivatel.profil.jmeno = jmeno

        if "bio" in data:
            bio, bio_error = get_str_field(data, "bio", max_length=500)
            if bio_error:
                return error_response(bio_error)
            uzivatel.profil.bio = bio

        if "fotka" in data:
            fotka, photo_error = get_str_field(data, "fotka")
            if photo_error:
                return error_response(photo_error)
            uzivatel.profil.fotka = fotka

        db.session.commit()
        return jsonify(
            {"message": "Profil uspesne aktualizovan", "uzivatel": uzivatel.to_dict()}
        )
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri aktualizaci profilu", 500)


@uzivatele_bp.route("/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def get_uzivatel_profil(uzivatel_id):
    current_user_id = int(get_jwt_identity())

    blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()
    if blokace:
        return error_response("Uzivatel je blokovan", 403)

    blokace_opacne = Blokace.query.filter_by(
        blokujici_id=uzivatel_id, blokovany_id=current_user_id
    ).first()
    if blokace_opacne:
        return error_response("Nemate pristup k tomuto profilu", 403)

    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    if not uzivatel:
        return error_response("Uzivatel nenalezen", 404)

    profil_data = uzivatel.to_dict()
    if uzivatel.profil:
        profil_data["profil"]["email"] = None

    return jsonify({"uzivatel": profil_data})


@uzivatele_bp.route("/hledat", methods=["GET"])
@jwt_required()
def hledat_uzivatele():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return error_response("Vyhledavaci dotaz musi mit alespon 2 znaky")
    if len(query) > 50:
        return error_response("Vyhledavaci dotaz muze mit maximalne 50 znaku")

    current_user_id = int(get_jwt_identity())

    # Vyhledavani jede pres partial match, aby vratilo i uzivatele podle casti jmena.
    uzivatele = (
        db.session.query(Uzivatel)
        .join(Profil)
        .filter(Profil.jmeno.ilike(f"%{query}%"))
        .limit(20)
        .all()
    )

    blokovane_ids = (
        db.session.query(Blokace.blokovany_id).filter_by(blokujici_id=current_user_id).all()
    )
    blokovane_ids_list = [item.blokovany_id for item in blokovane_ids]
    uzivatele = [user for user in uzivatele if user.id not in blokovane_ids_list]

    vysledky = []
    for uzivatel in uzivatele:
        if uzivatel.profil:
            vysledky.append(
                {
                    "id": uzivatel.id,
                    "jmeno": uzivatel.profil.jmeno,
                    "fotka": uzivatel.profil.fotka,
                    "hodnoceni_ridic": uzivatel.profil.get_prumerne_hodnoceni("ridic"),
                    "hodnoceni_pasazer": uzivatel.profil.get_prumerne_hodnoceni("pasazer"),
                }
            )

    return jsonify({"uzivatele": vysledky, "celkem": len(vysledky)})


@uzivatele_bp.route("/<int:uzivatel_id>/blokovat", methods=["POST"])
@jwt_required()
def blokovat_uzivatele(uzivatel_id):
    current_user_id = int(get_jwt_identity())
    if current_user_id == uzivatel_id:
        return error_response("Nemuzete blokovat sebe sama")
    if not db.session.get(Uzivatel, uzivatel_id):
        return error_response("Uzivatel nenalezen", 404)

    existujici_blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
    ).first()
    if existujici_blokace:
        return error_response("Uzivatel je jiz blokovan")

    try:
        blokace = Blokace(blokujici_id=current_user_id, blokovany_id=uzivatel_id)
        db.session.add(blokace)
        db.session.commit()
        return jsonify({"message": "Uzivatel uspesne blokovan"})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri blokovani uzivatele", 500)


@uzivatele_bp.route("/<int:uzivatel_id>/odblokovat", methods=["DELETE"])
@jwt_required()
def odblokovat_uzivatele(uzivatel_id):
    current_user_id = int(get_jwt_identity())
    blokace = Blokace.query.filter_by(
        blokujici_id=current_user_id, blokovany_id=uzivatel_id
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


@uzivatele_bp.route("/blokovani", methods=["GET"])
@jwt_required()
def get_blokovani_uzivatele():
    current_user_id = int(get_jwt_identity())
    blokace = (
        db.session.query(Blokace)
        .filter_by(blokujici_id=current_user_id)
        .join(Uzivatel, Blokace.blokovany_id == Uzivatel.id)
        .join(Profil)
        .all()
    )

    blokovani = []
    for item in blokace:
        uzivatel = db.session.get(Uzivatel, item.blokovany_id)
        if uzivatel and uzivatel.profil:
            blokovani.append(
                {
                    "id": uzivatel.id,
                    "jmeno": uzivatel.profil.jmeno,
                    "fotka": uzivatel.profil.fotka,
                }
            )

    return jsonify({"blokovani_uzivatele": blokovani})
