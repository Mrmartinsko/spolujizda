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
    """Overi seznam doprovodu tak, aby odpovidal poctu rezervovanych mist."""
    if raw_pasazeri is None:
        raw_pasazeri = []

    if not isinstance(raw_pasazeri, list):
        return None, "Dalsi pasazeri musi byt seznam jmen"

    expected_count = max(0, pocet_mist - 1)
    if len(raw_pasazeri) != expected_count:
        return None, "Pocet jmen dalsich pasazeru musi odpovidat poctu rezervovanych mist"

    normalized = []
    for jmeno in raw_pasazeri:
        if not isinstance(jmeno, str):
            return None, "Kazde jmeno dalsiho pasazera musi byt text"

        trimmed = jmeno.strip()
        if not trimmed:
            return None, "Jmena dalsich pasazeru nesmi byt prazdna"

        if len(trimmed) > MAX_DELKA_JMENA_PASAZERA:
            return None, f"Jmeno dalsiho pasazera muze mit maximalne {MAX_DELKA_JMENA_PASAZERA} znaku"

        normalized.append(trimmed)

    return normalized, None


def _get_user_display_name(uzivatel):
    """Vrati jmeno vhodne do notifikaci i kdyz uzivatel nema kompletni profil."""
    if not uzivatel:
        return "Uzivatel"

    profil = uzivatel.profil
    if not profil:
        return uzivatel.email

    parts = [getattr(profil, "jmeno", None), getattr(profil, "prijmeni", None)]
    full_name = " ".join(part for part in parts if part).strip()
    return full_name or getattr(profil, "prezdivka", None) or uzivatel.email


@rezervace_bp.route("/", methods=["POST"])
@jwt_required()
def create_rezervace():
    """Vytvori rezervaci jen pokud neporusi kapacitu ani navazujici business pravidla."""
    uzivatel_id = int(get_jwt_identity())
    data, error = get_json_data()
    if error:
        return error

    if "jizda_id" not in data:
        return error_response("ID jizdy je povinne")

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

    # Dokud uzivatel nedokonci povinne hodnoceni predchozi jizdy, dalsi rezervaci nepustime.
    pending = sync_pending_ratings_for_user(uzivatel_id, create_notifications=True)
    if pending:
        return jsonify(
            {
                "error": "Nejdriv ohodnot ridice z predchozi jizdy.",
                "pending": pending,
            }
        ), 403

    jizda = db.session.get(Jizda, jizda_id)
    if not jizda:
        return error_response("Jizda nenalezena", 404)

    if jizda.status in {"zrusena", "dokoncena"}:
        return error_response("Rezervaci lze vytvorit jen pro aktivni jizdu")

    muze, zprava = jizda.muze_rezervovat(uzivatel_id, pocet_mist)
    if not muze:
        return error_response(zprava)

    # Jedna aktivni rezervace na stejnou jizdu staci, dalsi by jen komplikovala kapacitu i UI.
    existujici = (
        Rezervace.query.filter_by(uzivatel_id=uzivatel_id, jizda_id=jizda_id)
        .filter(Rezervace.status.in_(["cekajici", "prijata"]))
        .first()
    )

    if existujici:
        return jsonify({"error": "Jiz mate aktivni rezervaci na tuto jizdu"}), 400

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
            f"Prisla nova rezervace od {passenger_name} na jizdu {jizda.odkud} -> {jizda.kam}.",
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
            {"message": "Rezervace uspesne vytvorena", "rezervace": rezervace.to_dict()}
        ), 201

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri vytvareni rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/prijmout", methods=["POST"])
@jwt_required()
def prijmout_rezervaci(rezervace_id):
    """Prijme cekajici rezervaci pod zamkem, aby se kapacita nerozbila soubehem."""
    uzivatel_id = int(get_jwt_identity())

    # with_for_update chrani kapacitu pred soubeznymi pokusy o prijeti vice rezervaci.
    rezervace = (
        Rezervace.query.filter_by(id=rezervace_id)
        .with_for_update()
        .first_or_404()
    )
    jizda = Jizda.query.filter_by(id=rezervace.jizda_id).with_for_update().first()

    if rezervace.jizda.ridic_id != uzivatel_id:
        return error_response("Nemate opravneni prijmout tuto rezervaci", 403)

    if rezervace.status != "cekajici":
        return error_response("Rezervace jiz byla zpracovana")

    try:
        if not jizda:
            db.session.rollback()
            return error_response("Jizda nenalezena", 404)

        if jizda.status in {"zrusena", "dokoncena"}:
            db.session.rollback()
            return error_response("Rezervaci lze prijmout jen u aktivni jizdy")

        if not jizda.ma_dostatek_volnych_mist(rezervace.pocet_mist):
            db.session.rollback()
            return error_response("Jizda je plne obsazena")

        rezervace.prijmout()
        vytvorit_oznameni(
            rezervace.uzivatel_id,
            f"Ridic prijal tvoji rezervaci na jizdu {jizda.odkud} -> {jizda.kam}.",
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

        return jsonify({"message": "Rezervace prijata", "rezervace": rezervace.to_dict()})

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri prijimani rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/odmitnout", methods=["POST"])
@jwt_required()
def odmitnout_rezervaci(rezervace_id):
    """Odmitne cekajici rezervaci a informuje pasazera o vysledku."""
    uzivatel_id = int(get_jwt_identity())
    rezervace = Rezervace.query.get_or_404(rezervace_id)

    if rezervace.jizda.ridic_id != uzivatel_id:
        return error_response("Nemate opravneni odmitnout tuto rezervaci", 403)

    if rezervace.status != "cekajici":
        return error_response("Rezervace jiz byla zpracovana")

    if rezervace.jizda.status in {"zrusena", "dokoncena"}:
        return error_response("Rezervaci lze odmitnout jen u aktivni jizdy")

    try:
        rezervace.odmitnout()
        vytvorit_oznameni(
            rezervace.uzivatel_id,
            f"Ridic odmitl tvoji rezervaci na jizdu {rezervace.jizda.odkud} -> {rezervace.jizda.kam}.",
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

        return jsonify({"message": "Rezervace odmitnuta", "rezervace": rezervace.to_dict()})

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri odmitani rezervace"}), 500


@rezervace_bp.route("/<int:rezervace_id>/zrusit", methods=["DELETE"])
@jwt_required()
def zrusit_rezervaci(rezervace_id):
    """Umozni pasazerovi opustit aktivni jizdu jen s dostatecnym predstihem."""
    user_id = int(get_jwt_identity())
    rez = Rezervace.query.get_or_404(rezervace_id)

    if rez.uzivatel_id != user_id:
        return error_response("Nemas opravneni rusit tuto rezervaci.", 403)

    jizda = rez.jizda
    if jizda.status != "aktivni":
        return error_response("Jizda neni aktivni, nelze ji opustit.")

    now = utc_now()
    if now > (jizda.cas_odjezdu - timedelta(hours=1)):
        return error_response("Jizdu lze opustit nejpozdeji 1 hodinu pred odjezdem.")

    rez.status = "zrusena"
    pasazer = next((u for u in jizda.pasazeri if u.id == user_id), None)
    if pasazer:
        jizda.pasazeri.remove(pasazer)

    db.session.commit()
    return jsonify({"message": "Rezervace byla zrusena a jizdu jste opustil."}), 200


@rezervace_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_rezervace():
    """Vrati odeslane i prijate rezervace v jednom payloadu pro prehledovou obrazovku."""
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
    """Vrati seznam rezervaci jen ridici dane jizdy."""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemate opravneni zobrazit rezervace teto jizdy"}), 403

    rezervace = Rezervace.query.filter_by(jizda_id=jizda_id).all()
    annotate_waiting_queue_positions(rezervace)
    return jsonify({"rezervace": [r.to_dict() for r in rezervace]})
