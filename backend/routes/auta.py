from sqlalchemy import false

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.uzivatel import Uzivatel
from utils.api import error_response, get_json_data, get_str_field, parse_positive_int
from utils.jizdy import zrusit_jizdu
from utils.validators import validate_spz

auta_bp = Blueprint("auta", __name__)


def _get_aktivni_jizdy_auta(auto_id):
    return Jizda.query.filter(Jizda.auto_id == auto_id, Jizda.status == "aktivni").all()


def _soft_delete_auto(auto, profil_id):
    bylo_primarni = auto.primarni
    auto.smazane = True
    auto.primarni = False

    if bylo_primarni:
        nove_primarni = Auto.query.filter(
            Auto.profil_id == profil_id,
            Auto.smazane == false(),
            Auto.id != auto.id,
        ).first()
        if nove_primarni:
            nove_primarni.primarni = True


def _normalize_auto_payload(data, *, partial=False):
    normalized = {}

    if not partial or "znacka" in data:
        znacka, error = get_str_field(data, "znacka", required=not partial, max_length=50)
        if error:
            return None, error
        if znacka is not None:
            normalized["znacka"] = znacka

    if not partial or "model" in data:
        model, error = get_str_field(data, "model", required=not partial, max_length=50)
        if error:
            return None, error
        if model is not None:
            normalized["model"] = model

    for field_name, max_length in [("barva", 30), ("spz", 20)]:
        if field_name in data:
            value, error = get_str_field(data, field_name, max_length=max_length)
            if error:
                return None, error
            normalized[field_name] = value or None

    for field_name in ["primarni", "docasne"]:
        if field_name in data:
            value = data.get(field_name)
            if not isinstance(value, bool):
                return None, f"Pole {field_name} musi byt true nebo false"
            normalized[field_name] = value

    if normalized.get("spz") and not validate_spz(normalized["spz"]):
        return None, "Neplatny format SPZ"

    return normalized, None


def get_uzivatel_a_profil():
    uzivatel_id = int(get_jwt_identity())
    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    if not uzivatel:
        return None, error_response("Uzivatel nenalezen", 404), None
    if not uzivatel.profil:
        return None, error_response("Profil nenalezen", 404), None
    return uzivatel, None, None


@auta_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_auta():
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auta = (
        Auto.query.filter(Auto.profil_id == uzivatel.profil.id, Auto.smazane == false())
        .order_by(Auto.primarni.desc())
        .all()
    )
    return jsonify([auto.to_dict() for auto in auta])


@auta_bp.route("/moje-nove", methods=["POST"])
@jwt_required()
def create_auto():
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    data, error = get_json_data()
    if error:
        return error

    normalized, validation_error = _normalize_auto_payload(data)
    if validation_error:
        return error_response(validation_error)

    try:
        auto = Auto(
            profil_id=uzivatel.profil.id,
            znacka=normalized["znacka"],
            model=normalized["model"],
            barva=normalized.get("barva"),
            spz=normalized.get("spz"),
            primarni=normalized.get("primarni", False),
            docasne=normalized.get("docasne", False),
            smazane=False,
        )

        if auto.primarni:
            Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.primarni.is_(True),
                Auto.smazane == false(),
            ).update({"primarni": False})

        ma_primarni = Auto.query.filter(
            Auto.profil_id == uzivatel.profil.id,
            Auto.primarni.is_(True),
            Auto.smazane == false(),
        ).first()
        if not auto.primarni and not ma_primarni:
            auto.primarni = True

        db.session.add(auto)
        db.session.commit()
        return jsonify({"message": "Auto uspesne pridano", "auto": auto.to_dict()}), 201
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri vytvareni auta", 500)


@auta_bp.route("/<int:auto_id>", methods=["PUT"])
@jwt_required()
def update_auto(auto_id):
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not auto:
        return error_response("Auto nenalezeno", 404)

    data, error = get_json_data()
    if error:
        return error

    normalized, validation_error = _normalize_auto_payload(data, partial=True)
    if validation_error:
        return error_response(validation_error)

    try:
        for field_name in ["znacka", "model", "barva", "spz", "docasne", "primarni"]:
            if field_name in normalized:
                setattr(auto, field_name, normalized[field_name])

        if auto.primarni:
            Auto.query.filter(
                Auto.profil_id == uzivatel.profil.id,
                Auto.id != auto.id,
                Auto.primarni.is_(True),
                Auto.smazane == false(),
            ).update({"primarni": False})

        db.session.commit()
        return jsonify({"message": "Auto uspesne aktualizovano", "auto": auto.to_dict()})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri aktualizaci auta", 500)


@auta_bp.route("/<int:auto_id>", methods=["DELETE"])
@jwt_required()
def delete_auto(auto_id):
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not auto:
        return error_response("Auto nenalezeno", 404)

    aktivni_jizdy = _get_aktivni_jizdy_auta(auto.id)
    if aktivni_jizdy:
        return error_response("Toto auto ma aktivni jizdy, je treba jej nahradit", 409)

    try:
        _soft_delete_auto(auto, uzivatel.profil.id)
        db.session.commit()
        return jsonify({"message": "Auto bylo uspesne smazano"})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri mazani auta", 500)


@auta_bp.route("/<int:auto_id>/nastavit-primarni", methods=["POST"])
@jwt_required()
def nastavit_primarni(auto_id):
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not auto:
        return error_response("Auto nenalezeno", 404)

    try:
        Auto.query.filter(
            Auto.profil_id == uzivatel.profil.id,
            Auto.primarni.is_(True),
            Auto.smazane == false(),
        ).update({"primarni": False})

        auto.primarni = True
        db.session.commit()
        return jsonify({"message": "Auto nastaveno jako primarni", "auto": auto.to_dict()})
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri nastavovani primarniho auta", 500)


@auta_bp.route("/replace/<int:stare_auto_id>", methods=["POST"])
@jwt_required()
def replace_auto(stare_auto_id):
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    stare_auto = Auto.query.filter(
        Auto.id == stare_auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not stare_auto:
        return error_response("Auto nenalezeno", 404)

    aktivni_jizdy = _get_aktivni_jizdy_auta(stare_auto.id)
    if not aktivni_jizdy:
        return error_response("Toto auto nema zadne aktivni jizdy")

    data, error = get_json_data()
    if error:
        return error

    nove_auto_id, new_auto_error = parse_positive_int(data.get("nove_auto_id"), "nove_auto_id")
    if new_auto_error:
        return error_response(new_auto_error)

    nove_auto = Auto.query.filter(
        Auto.id == nove_auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not nove_auto:
        return error_response("Nove auto neexistuje nebo nepatri uzivateli", 404)

    try:
        for jizda in aktivni_jizdy:
            jizda.auto_id = nove_auto.id

        _soft_delete_auto(stare_auto, uzivatel.profil.id)
        db.session.commit()
        return jsonify(
            {
                "message": f"Auto u {len(aktivni_jizdy)} aktivnich jizd bylo nahrazeno a stare auto smazano"
            }
        )
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri nahrazeni auta", 500)


@auta_bp.route("/<int:auto_id>/zrusit-aktivni-jizdy", methods=["POST"])
@jwt_required()
def zrusit_aktivni_jizdy_auta(auto_id):
    uzivatel, err, code = get_uzivatel_a_profil()
    if err:
        return err, code

    auto = Auto.query.filter(
        Auto.id == auto_id,
        Auto.profil_id == uzivatel.profil.id,
        Auto.smazane == false(),
    ).first()
    if not auto:
        return error_response("Auto nenalezeno", 404)

    aktivni_jizdy = _get_aktivni_jizdy_auta(auto.id)
    if not aktivni_jizdy:
        return error_response("Toto auto nema zadne aktivni jizdy")

    try:
        for jizda in aktivni_jizdy:
            zrusit_jizdu(jizda)

        _soft_delete_auto(auto, uzivatel.profil.id)
        db.session.commit()
        return jsonify(
            {
                "message": f"Bylo zruseno {len(aktivni_jizdy)} aktivnich jizd a auto bylo smazano"
            }
        )
    except Exception:
        db.session.rollback()
        return error_response("Chyba pri ruseni aktivnich jizd auta", 500)
