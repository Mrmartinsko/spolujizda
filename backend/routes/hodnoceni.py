from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.hodnoceni import Hodnoceni
from models.jizda import Jizda
from models.oznameni import Oznameni
from models.uzivatel import Uzivatel
from utils.api import error_response, get_json_data, get_str_field, parse_positive_int
from utils.datetime_utils import utc_now
from utils.pending_ratings import sync_pending_ratings_for_user

hodnoceni_bp = Blueprint("hodnoceni", __name__)


@hodnoceni_bp.route("/", methods=["POST"])
@jwt_required()
def create_hodnoceni():
    """Vytvoření hodnocení pouze mezi účastníky dokončené jízdy."""
    autor_id = int(get_jwt_identity())
    data, error = get_json_data()
    if error:
        return error

    required_fields = ["jizda_id", "cilovy_uzivatel_id", "role", "znamka"]
    for field in required_fields:
        if field not in data:
            return error_response(f"Pole {field} je povinné")

    jizda_id, ride_error = parse_positive_int(data.get("jizda_id"), "jizda_id")
    if ride_error:
        return error_response(ride_error)

    cilovy_uzivatel_id, target_error = parse_positive_int(
        data.get("cilovy_uzivatel_id"), "cilovy_uzivatel_id"
    )
    if target_error:
        return error_response(target_error)

    role, role_error = get_str_field(data, "role", required=True)
    if role_error:
        return error_response(role_error)

    komentar, comment_error = get_str_field(data, "komentar", max_length=500)
    if comment_error:
        return error_response(comment_error)

    try:
        znamka = int(data["znamka"])
    except (TypeError, ValueError):
        return error_response("Známka musí být číslo od 1 do 5")

    if autor_id == cilovy_uzivatel_id:
        return error_response("Nemůžete hodnotit sebe sama")
    if role not in {"ridic", "pasazer"}:
        return error_response('Role musí být "ridic" nebo "pasazer"')
    if znamka < 1 or znamka > 5:
        return error_response("Známka musí být číslo od 1 do 5")

    jizda = db.session.get(Jizda, jizda_id)
    if not jizda:
        return error_response("Jízda nenalezena", 404)

    # Po příjezdu přepneme status na dokoncena, aby šlo hodnocení vytvořit hned.
    now = utc_now()
    if jizda.status == "aktivni" and jizda.cas_prijezdu and jizda.cas_prijezdu <= now:
        jizda.status = "dokoncena"
        db.session.commit()

    if jizda.status != "dokoncena":
        return error_response("Hodnotit lze až po dokončení jízdy")

    cilovy_uzivatel = db.session.get(Uzivatel, cilovy_uzivatel_id)
    if not cilovy_uzivatel:
        return error_response("Cílový uživatel nenalezen", 404)

    autor_is_driver = autor_id == jizda.ridic_id
    autor_is_passenger = any(p.id == autor_id for p in jizda.pasazeri)
    target_is_driver = cilovy_uzivatel_id == jizda.ridic_id
    target_is_passenger = any(p.id == cilovy_uzivatel_id for p in jizda.pasazeri)

    if not (autor_is_driver or autor_is_passenger):
        return error_response("Tuto jízdu jste nejel", 403)
    if not (target_is_driver or target_is_passenger):
        return error_response("Cílový uživatel nebyl účastníkem této jízdy")

    # Řidiče hodnotí jen pasažér, pasažéra naopak pouze řidič dané jízdy.
    if role == "ridic":
        if not autor_is_passenger or not target_is_driver:
            return error_response("Řidiče může hodnotit pouze pasažér z této jízdy")
    else:
        if not autor_is_driver or not target_is_passenger:
            return error_response("Pasažéra může hodnotit pouze řidič z této jízdy")

    existujici = Hodnoceni.query.filter_by(
        autor_id=autor_id,
        cilovy_uzivatel_id=cilovy_uzivatel_id,
        jizda_id=jizda_id,
        role=role,
    ).first()
    if existujici:
        return error_response("Hodnocení pro tuto jízdu už existuje")

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
        Oznameni.query.filter_by(
            prijemce_id=autor_id,
            typ="hodnoceni_ceka",
            jizda_id=jizda_id,
            cilovy_uzivatel_id=cilovy_uzivatel_id,
        ).update({"precteno": True}, synchronize_session=False)
        db.session.commit()

        return jsonify(
            {"message": "Hodnocení úspěšně přidáno", "hodnoceni": hodnoceni.to_dict()}
        ), 201
    except Exception:
        db.session.rollback()
        return error_response("Chyba při vytváření hodnocení", 500)


@hodnoceni_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_hodnoceni():
    """Vrátí dokončené jízdy, kde má uživatel stále nevyřešené hodnocení."""
    uzivatel_id = int(get_jwt_identity())
    pending = sync_pending_ratings_for_user(uzivatel_id, create_notifications=True)
    return jsonify({"pending": pending})


@hodnoceni_bp.route("/uzivatel/<int:uzivatel_id>", methods=["GET"])
@jwt_required()
def get_hodnoceni_uzivatele(uzivatel_id):
    """Vrátí hodnocení konkrétního uživatele a souhrnné statistiky podle role."""
    role = request.args.get("role")

    if not db.session.get(Uzivatel, uzivatel_id):
        return error_response("Uživatel nenalezen", 404)

    query = Hodnoceni.query.filter_by(cilovy_uzivatel_id=uzivatel_id)
    if role in {"ridic", "pasazer"}:
        query = query.filter_by(role=role)

    hodnoceni = query.order_by(Hodnoceni.datum.desc()).all()
    celkem = len(hodnoceni)
    prumer = sum(h.znamka for h in hodnoceni) / celkem if celkem > 0 else 0

    rozdeleni = {str(i): 0 for i in range(1, 6)}
    for item in hodnoceni:
        rozdeleni[str(item.znamka)] += 1

    return jsonify(
        {
            "hodnoceni": [item.to_dict() for item in hodnoceni],
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
    """Vrátí odděleně přijatá a udělená hodnocení přihlášeného uživatele."""
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
            "dostana_hodnoceni": [item.to_dict() for item in dostana],
            "dana_hodnoceni": [item.to_dict() for item in dana],
        }
    )


@hodnoceni_bp.route("/<int:hodnoceni_id>", methods=["PUT"])
@jwt_required()
def update_hodnoceni(hodnoceni_id):
    """Umožní autorovi upravit známku nebo komentář bez změny vazby na jízdu."""
    uzivatel_id = int(get_jwt_identity())
    hodnoceni = db.session.get(Hodnoceni, hodnoceni_id)
    if not hodnoceni:
        return error_response("Hodnocení nenalezeno", 404)

    if hodnoceni.autor_id != uzivatel_id:
        return error_response("Nemáte oprávnění upravovat toto hodnocení", 403)

    data, error = get_json_data()
    if error:
        return error

    try:
        if "znamka" in data:
            try:
                znamka = int(data["znamka"])
            except (TypeError, ValueError):
                return error_response("Známka musí být číslo od 1 do 5")

            if znamka < 1 or znamka > 5:
                return error_response("Známka musí být číslo od 1 do 5")
            hodnoceni.znamka = znamka

        if "komentar" in data:
            komentar, comment_error = get_str_field(data, "komentar", max_length=500)
            if comment_error:
                return error_response(comment_error)
            hodnoceni.komentar = komentar

        db.session.commit()
        return jsonify(
            {
                "message": "Hodnocení úspěšně aktualizováno",
                "hodnoceni": hodnoceni.to_dict(),
            }
        )
    except Exception:
        db.session.rollback()
        return error_response("Chyba při aktualizaci hodnocení", 500)


@hodnoceni_bp.route("/<int:hodnoceni_id>", methods=["DELETE"])
@jwt_required()
def delete_hodnoceni(hodnoceni_id):
    """Smaže hodnocení pouze jeho autorovi, aby nešla měnit cizí zpětná vazba."""
    uzivatel_id = int(get_jwt_identity())
    hodnoceni = db.session.get(Hodnoceni, hodnoceni_id)
    if not hodnoceni:
        return error_response("Hodnocení nenalezeno", 404)

    if hodnoceni.autor_id != uzivatel_id:
        return error_response("Nemáte oprávnění smazat toto hodnocení", 403)

    try:
        db.session.delete(hodnoceni)
        db.session.commit()
        return jsonify({"message": "Hodnocení úspěšně smazáno"})
    except Exception:
        db.session.rollback()
        return error_response("Chyba při mazání hodnocení", 500)