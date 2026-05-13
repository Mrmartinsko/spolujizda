from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.jizda import Jizda
from models.rezervace import Rezervace
from utils.api import error_response, get_json_data, get_str_field, parse_positive_int
from utils.datetime_utils import utc_now
from utils.notifications import vytvorit_oznameni
from utils.pending_ratings import sync_pending_ratings_for_user
from utils.reservations import annotate_waiting_queue_positions


rezervace_bp = Blueprint("rezervace", __name__)

MAX_DELKA_JMENA_PASAZERA = 80


def _validate_dalsi_pasazeri(raw_pasazeri, pocet_mist):
    """Ověří seznam doprovodu tak, aby odpovídal počtu rezervovaných míst."""
    if raw_pasazeri is None:
        raw_pasazeri = []

    if not isinstance(raw_pasazeri, list):
        return None, "Další pasažéři musí být seznam jmen"

    expected_count = max(0, pocet_mist - 1)
    if len(raw_pasazeri) != expected_count:
        return None, "Počet jmen dalších pasažérů musí odpovídat počtu rezervovaných míst"

    normalized = []
    for jmeno in raw_pasazeri:
        if not isinstance(jmeno, str):
            return None, "Každé jméno dalšího pasažéra musí být text"

        trimmed = jmeno.strip()
        if not trimmed:
            return None, "Jména dalších pasažérů nesmí být prázdná"

        if len(trimmed) > MAX_DELKA_JMENA_PASAZERA:
            return None, f"Jméno dalšího pasažéra může mít maximálně {MAX_DELKA_JMENA_PASAZERA} znaků"

        normalized.append(trimmed)

    return normalized, None


def _get_user_display_name(uzivatel):
    """Vrátí jméno vhodné do notifikací i když uživatel nemá kompletní profil."""
    if not uzivatel:
        return "Uživatel"

    profil = uzivatel.profil
    if not profil:
        return uzivatel.email

    parts = [getattr(profil, "jmeno", None), getattr(profil, "prijmeni", None)]
    full_name = " ".join(part for part in parts if part).strip()
    return full_name or getattr(profil, "prezdivka", None) or uzivatel.email


@rezervace_bp.route("/", methods=["POST"])
@jwt_required()
def create_rezervace():
    """Vytvoří rezervaci jen pokud neporuší kapacitu ani navazující business pravidla."""
    uzivatel_id = int(get_jwt_identity())
    data, error = get_json_data()
    if error:
        return error

    if "jizda_id" not in data:
        return error_response("ID jízdy je povinné")

    jizda_id, ride_error = parse_positive_int(data.get("jizda_id"), "jizda_id")
    if ride_error:
        return error_response(ride_error)

    pocet_mist, seats_error = parse_positive_int(data.get("pocet_mist", 1), "pocet_mist")
    if seats_error:
        return error_response(seats_error)

    dalsi_pasazeri = data.get("dalsi_pasazeri", [])
    poznamka, note_error = get_str_field(data, "poznamka")
    if note_error:
        return error_response(note_error)

    dalsi_pasazeri, chyba_dalsich_pasazeru = _validate_dalsi_pasazeri(
        dalsi_pasazeri, pocet_mist
    )
    if chyba_dalsich_pasazeru:
        return jsonify({"error": chyba_dalsich_pasazeru}), 400

    # Dokud uživatel nedokončí povinné hodnocení předchozí jízdy, další rezervaci nepustíme.
    pending = sync_pending_ratings_for_user(uzivatel_id, create_notifications=True)
    if pending:
        return jsonify(
            {
                "error": "Nejdřív ohodnoť řidiče z předchozí jízdy.",
                "pending": pending,
            }
        ), 403

    jizda = db.session.get(Jizda, jizda_id)
    if not jizda:
        return error_response("Jízda nenalezena", 404)

    if jizda.status in {"zrusena", "dokoncena"}:
        return error_response("Rezervaci lze vytvořit jen pro aktivní jízdu")

    muze, zprava = jizda.muze_rezervovat(uzivatel_id, pocet_mist)
    if not muze:
        return error_response(zprava)

    # Jedna aktivní rezervace na stejnou jízdu stačí, další by jen komplikovala kapacitu i UI.
    existujici = (
        Rezervace.query.filter_by(uzivatel_id=uzivatel_id, jizda_id=jizda_id)
        .filter(Rezervace.status.in_(["cekajici", "prijata"]))
        .first()
    )

    if existujici:
        return jsonify({"error": "Již máte aktivní rezervaci na tuto jízdu"}), 400

    try:
        rezervace = Rezervace(
            uzivatel_id=uzivatel_id,
            jizda_id=jizda_id,
            poznamka=poznamka,
            pocet_mist=pocet_mist,
            dalsi_pasazeri=dalsi_pasazeri,
        )

        db.session.add(rezervace)
        db.session.flush()

        passenger_name = _get_user_display_name(rezervace.uzivatel)
        vytvorit_oznameni(
            jizda.ridic_id,
            f"Přišla nová rezervace od {passenger_name} na jízdu {jizda.odkud} -> {jizda.kam}.",
            "rezervace_nova",
            kategorie="rezervace",
            odesilatel_id=uzivatel_id,
            target_path=f"/moje-jizdy?focusRide={jizda.id}&openReservations=1",
            jizda_id=jizda.id,
            rezervace_id=rezervace.id,
            commit=False,
        )

        db.session.commit()
        annotate_waiting_queue_positions([rezervace])

        return jsonify(
            {"message": "Rezervace úspěšně vytvořena", "rezervace": rezervace.to_dict()}
        ), 201

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/prijmout", methods=["POST"])
@jwt_required()
def prijmout_rezervaci(rezervace_id):
    """Přijme čekající rezervaci pod zámkem, aby se kapacita nerozbila souběhem."""
    uzivatel_id = int(get_jwt_identity())

    # with_for_update chrání kapacitu před souběžnými pokusy o přijetí více rezervací.
    rezervace = (
        Rezervace.query.filter_by(id=rezervace_id)
        .with_for_update()
        .first_or_404()
    )
    jizda = Jizda.query.filter_by(id=rezervace.jizda_id).with_for_update().first()

    if rezervace.jizda.ridic_id != uzivatel_id:
        return error_response("Nemáte oprávnění přijmout tuto rezervaci", 403)

    if rezervace.status != "cekajici":
        return error_response("Rezervace již byla zpracována")

    try:
        if not jizda:
            db.session.rollback()
            return error_response("Jízda nenalezena", 404)

        if jizda.status in {"zrusena", "dokoncena"}:
            db.session.rollback()
            return error_response("Rezervaci lze přijmout jen u aktivní jízdy")

        if not jizda.ma_dostatek_volnych_mist(rezervace.pocet_mist):
            db.session.rollback()
            return error_response("Jízda je plně obsazena")

        rezervace.prijmout()
        vytvorit_oznameni(
            rezervace.uzivatel_id,
            f"Řidič přijal tvoji rezervaci na jízdu {jizda.odkud} -> {jizda.kam}.",
            "rezervace_prijata",
            kategorie="rezervace",
            odesilatel_id=uzivatel_id,
            target_path=f"/moje-rezervace?focusReservation={rezervace.id}",
            jizda_id=jizda.id,
            rezervace_id=rezervace.id,
            commit=False,
        )

        db.session.commit()
        annotate_waiting_queue_positions([rezervace])

        return jsonify({"message": "Rezervace přijata", "rezervace": rezervace.to_dict()})

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při přijímání rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/odmitnout", methods=["POST"])
@jwt_required()
def odmitnout_rezervaci(rezervace_id):
    """Odmítne čekající rezervaci a informuje pasažéra o výsledku."""
    uzivatel_id = int(get_jwt_identity())
    rezervace = Rezervace.query.get_or_404(rezervace_id)

    if rezervace.jizda.ridic_id != uzivatel_id:
        return error_response("Nemáte oprávnění odmítnout tuto rezervaci", 403)

    if rezervace.status != "cekajici":
        return error_response("Rezervace již byla zpracována")

    if rezervace.jizda.status in {"zrusena", "dokoncena"}:
        return error_response("Rezervaci lze odmítnout jen u aktivní jízdy")

    try:
        rezervace.odmitnout()
        vytvorit_oznameni(
            rezervace.uzivatel_id,
            f"Řidič odmítl tvoji rezervaci na jízdu {rezervace.jizda.odkud} -> {rezervace.jizda.kam}.",
            "rezervace_odmitnuta",
            kategorie="rezervace",
            odesilatel_id=uzivatel_id,
            target_path=f"/moje-rezervace?focusReservation={rezervace.id}",
            jizda_id=rezervace.jizda_id,
            rezervace_id=rezervace.id,
            commit=False,
        )

        db.session.commit()
        annotate_waiting_queue_positions([rezervace])

        return jsonify({"message": "Rezervace odmítnuta", "rezervace": rezervace.to_dict()})

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při odmítání rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/zrusit", methods=["DELETE"])
@jwt_required()
def zrusit_rezervaci(rezervace_id):
    """Umožní pasažérovi opustit aktivní jízdu jen s dostatečným předstihem."""
    user_id = int(get_jwt_identity())
    rez = Rezervace.query.get_or_404(rezervace_id)

    if rez.uzivatel_id != user_id:
        return error_response("Nemáš oprávnění rušit tuto rezervaci.", 403)

    jizda = rez.jizda
    if jizda.status != "aktivni":
        return error_response("Jízda není aktivní, nelze ji opustit.")

    now = utc_now()
    if now > (jizda.cas_odjezdu - timedelta(hours=1)):
        return error_response("Jízdu lze opustit nejpozději 1 hodinu před odjezdem.")

    rez.status = "zrusena"
    pasazer = next((u for u in jizda.pasazeri if u.id == user_id), None)
    if pasazer:
        jizda.pasazeri.remove(pasazer)

    db.session.commit()
    return jsonify({"message": "Rezervace byla zrušena a jízdu jste opustil."}), 200


@rezervace_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_rezervace():
    """Vrátí odeslané i přijaté rezervace v jednom payloadu pro přehledovou obrazovku."""
    uzivatel_id = int(get_jwt_identity())

    moje_rezervace = Rezervace.query.filter_by(uzivatel_id=uzivatel_id).all()

    moje_jizdy = Jizda.query.filter_by(ridic_id=uzivatel_id).all()
    rezervace_na_moje_jizdy = []
    for jizda in moje_jizdy:
        rezervace_na_moje_jizdy.extend(Rezervace.query.filter_by(jizda_id=jizda.id).all())

    annotate_waiting_queue_positions(moje_rezervace)
    annotate_waiting_queue_positions(rezervace_na_moje_jizdy)

    vysledek = []

    for rezervace in moje_rezervace:
        data = rezervace.to_dict()
        data["typ"] = "odeslana"
        vysledek.append(data)

    for rezervace in rezervace_na_moje_jizdy:
        data = rezervace.to_dict()
        data["typ"] = "prijata"
        vysledek.append(data)

    return jsonify(vysledek)


@rezervace_bp.route("/jizda/<int:jizda_id>", methods=["GET"])
@jwt_required()
def get_rezervace_jizdy(jizda_id):
    """Vrátí seznam rezervací jen řidiči dané jízdy."""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zobrazit rezervace této jízdy"}), 403

    rezervace = Rezervace.query.filter_by(jizda_id=jizda_id).all()
    annotate_waiting_queue_positions(rezervace)
    return jsonify({"rezervace": [r.to_dict() for r in rezervace]})