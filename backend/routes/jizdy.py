from datetime import datetime, timedelta
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.mezistanice import Mezistanice
from models.rezervace import Rezervace
from models.uzivatel import Uzivatel
from utils.api import (
    error_response,
    get_json_data,
    parse_iso_datetime,
    parse_non_negative_float,
    parse_positive_int,
)
from utils.cities import get_city_by_place_id
from utils.datetime_utils import utc_now
from utils.jizdy import zrusit_jizdu
from utils.notifications import vytvorit_oznameni
from utils.text_normalization import normalize_search_text, sanitize_location_text


jizdy_bp = Blueprint("jizdy", __name__)


LOCATION_ALLOWED_RE = re.compile(r"[^A-Za-zÀ-ž0-9\s-]")


def _validate_location_field(value, field_name):
    """Ověří text lokace a vrátí jeho sanitizovanou podobu pro další uložení."""
    if not isinstance(value, str):
        return False, f"Pole {field_name} musí být text"

    normalized = sanitize_location_text(value)
    if not normalized:
        return False, f"Pole {field_name} je povinné"
    if len(normalized) > 100:
        return False, f"Pole {field_name} může mít maximálně 100 znaků"
    if LOCATION_ALLOWED_RE.search(normalized):
        return False, f"Pole {field_name} může obsahovat jen písmena, čísla, mezery a pomlčky"

    return True, normalized


def _extract_location_payload(data, field_name, *, required):
    """Sjednotí textovou lokaci a volitelný place_id do jednoho payloadu."""
    raw_text = data.get(field_name)
    if raw_text is None:
        if required:
            return False, f"Pole {field_name} je povinné"
        return True, None

    ok, text_value = _validate_location_field(raw_text, field_name)
    if not ok:
        return False, text_value

    place_id = (data.get(f"{field_name}_place_id") or "").strip() or None
    city = get_city_by_place_id(place_id) if place_id else None

    if place_id and not city:
        return False, f"Pole {field_name} obsahuje neplatnou lokalitu"

    # Pokud máme place_id z autocomplete, bereme canonical display_name z backendu.
    if city:
        return True, {
            "text": city["display_name"],
            "place_id": place_id,
            "address": city["address"],
        }

    return True, {
        "text": text_value,
        "place_id": None,
        "address": None,
    }


def _validate_mezistanice_list(data):
    """Převede mezistanice ze stringu nebo objektu na jednotný seznam zastávek."""
    raw_stops = data.get("mezistanice", [])
    if raw_stops is None:
        return True, []
    if not isinstance(raw_stops, list):
        return False, "mezistanice musí být seznam"

    normalized_stops = []
    for item in raw_stops:
        if isinstance(item, str):
            ok, stop_text = _validate_location_field(item, "mezistanice")
            if not ok:
                return False, stop_text
            normalized_stops.append({
                "text": stop_text,
                "place_id": None,
                "address": None,
            })
            continue

        if not isinstance(item, dict):
            return False, "mezistanice musí být seznam textů nebo objektů"

        stop_payload = {
            "mezistanice": item.get("text") or item.get("misto"),
            "mezistanice_place_id": item.get("place_id") or item.get("misto_place_id"),
        }
        ok, parsed = _extract_location_payload(stop_payload, "mezistanice", required=True)
        if not ok:
            return False, parsed
        normalized_stops.append(parsed)

    return True, normalized_stops


def _get_auto_label(auto):
    """Vrátí krátký lidsky čitelný popis auta pro notifikace a porovnání změn."""
    if not auto:
        return None

    if getattr(auto, "smazane", False):
        return "Smazané auto"

    znacka = getattr(auto, "znacka", None) or ""
    model = getattr(auto, "model", None) or ""
    spz = getattr(auto, "spz", None)
    label = " ".join(part for part in [znacka, model] if part).strip()
    return f"{label} ({spz})".strip() if spz and label else (label or spz)


def _collect_important_ride_changes(jizda, previous_state):
    """Vypíše jen ty změny jízdy, které mají smysl oznámit pasažérům."""
    changed_labels = []

    if previous_state["odkud"] != jizda.odkud:
        changed_labels.append("odkud")
    if previous_state["kam"] != jizda.kam:
        changed_labels.append("kam")
    if previous_state["cas_odjezdu"] != jizda.cas_odjezdu:
        changed_labels.append("čas odjezdu")
    if previous_state["cas_prijezdu"] != jizda.cas_prijezdu:
        changed_labels.append("čas příjezdu")
    if previous_state["auto_label"] != _get_auto_label(jizda.auto):
        changed_labels.append("auto")

    return changed_labels


def _route_points_for_ride(ride):
    """Složí celou trasu do pořadí odkud -> mezistanice -> kam pro vyhledávání."""
    points = [{
        "role": "odkud",
        "position": 0,
        "text": ride.odkud,
        "place_id": ride.odkud_place_id,
    }]

    stops_sorted = sorted(list(ride.mezistanice), key=lambda m: (m.poradi or 0))
    for index, stop in enumerate(stops_sorted, start=1):
        points.append({
            "role": "mezistanice",
            "position": index,
            "text": stop.misto,
            "place_id": stop.misto_place_id,
        })

    points.append({
        "role": "kam",
        "position": len(points),
        "text": ride.kam,
        "place_id": ride.kam_place_id,
    })
    return points


def _matches_query_point(point, query):
    """Porovná hledanou lokaci buď přes place_id, nebo fallbackem přes text."""
    if not query:
        return False

    query_place_id = query.get("place_id")
    if query_place_id:
        return query_place_id == point.get("place_id")

    query_text = normalize_search_text(query.get("text"))
    point_text = normalize_search_text(point.get("text"))
    return bool(query_text and point_text and query_text in point_text)


def _build_search_query_payload(text_key, place_id_key):
    """Připraví query payload z URL parametru jen pokud uživatel vyplnil nějaký filtr."""
    text_value = (request.args.get(text_key) or "").strip()
    place_id_value = (request.args.get(place_id_key) or "").strip() or None
    if not text_value and not place_id_value:
        return None
    return {
        "text": text_value,
        "place_id": place_id_value,
    }


def _classify_ride_match(ride, odkud_query, kam_query):
    """Rozliší full a partial match podle pořadí bodů na trase."""
    route_points = _route_points_for_ride(ride)
    odkud_candidates = [point for point in route_points if point["role"] != "kam"]
    kam_candidates = [point for point in route_points if point["role"] != "odkud"]

    odkud_positions = [
        point["position"]
        for point in odkud_candidates
        if odkud_query and _matches_query_point(point, odkud_query)
    ]
    kam_positions = [
        point["position"]
        for point in kam_candidates
        if kam_query and _matches_query_point(point, kam_query)
    ]

    has_odkud_match = bool(odkud_query and odkud_positions)
    has_kam_match = bool(kam_query and kam_positions)

    if odkud_query and kam_query:
        if has_odkud_match and has_kam_match:
            # Full match platí jen tehdy, když hledané odkud leží na trase před hledaným kam.
            if any(i < j for i in odkud_positions for j in kam_positions):
                return "full"
            return None
        if has_odkud_match or has_kam_match:
            return "partial"
        return None

    if has_odkud_match or has_kam_match:
        return "partial"
    return None


def _filter_rides_by_volna_mista(jizdy, pocet_pasazeru):
    """Odstraní jízdy, které nemají dostatek volných míst pro zadaný počet pasažérů."""
    return [jizda for jizda in jizdy if jizda.ma_dostatek_volnych_mist(pocet_pasazeru)]


def _notification_recipient_ids_for_cancelled_ride(jizda):
    recipient_ids = {pasazer.id for pasazer in jizda.pasazeri if pasazer.id != jizda.ridic_id}
    active_reservation_statuses = {"cekajici", "prijata"}

    for rezervace in jizda.rezervace:
        if rezervace.status in active_reservation_statuses and rezervace.uzivatel_id != jizda.ridic_id:
            recipient_ids.add(rezervace.uzivatel_id)

    return sorted(recipient_ids)


@jizdy_bp.route("/", methods=["GET"])
def get_jizdy():
    """Jednoduchý filtr výpisu.
    Tento endpoint záměrně zůstává jednodušší než /vyhledat.
    Pokud je přítomné place_id, používá přesné porovnání místa.
    Jinak se pro jednoduché procházení vrací k textovému vyhledávání.
    """
    odkud = request.args.get("odkud")
    kam = request.args.get("kam")
    odkud_place_id = (request.args.get("odkud_place_id") or "").strip() or None
    kam_place_id = (request.args.get("kam_place_id") or "").strip() or None
    datum = request.args.get("datum")
    pocet_pasazeru = request.args.get("pocet_pasazeru", type=int)

    query = Jizda.query.filter_by(status="aktivni")

    if odkud_place_id:
        query = query.filter(
            or_(
                Jizda.odkud_place_id == odkud_place_id,
                db.session.query(Mezistanice.id)
                .filter(Mezistanice.jizda_id == Jizda.id)
                .filter(Mezistanice.misto_place_id == odkud_place_id)
                .exists(),
            )
        )
    elif odkud:
        pattern = f"%{odkud}%"
        query = query.filter(
            or_(
                Jizda.odkud.ilike(pattern),
                db.session.query(Mezistanice.id)
                .filter(Mezistanice.jizda_id == Jizda.id)
                .filter(Mezistanice.misto.ilike(pattern))
                .exists(),
            )
        )

    if kam_place_id:
        query = query.filter(
            or_(
                Jizda.kam_place_id == kam_place_id,
                db.session.query(Mezistanice.id)
                .filter(Mezistanice.jizda_id == Jizda.id)
                .filter(Mezistanice.misto_place_id == kam_place_id)
                .exists(),
            )
        )
    elif kam:
        pattern = f"%{kam}%"
        query = query.filter(
            or_(
                Jizda.kam.ilike(pattern),
                db.session.query(Mezistanice.id)
                .filter(Mezistanice.jizda_id == Jizda.id)
                .filter(Mezistanice.misto.ilike(pattern))
                .exists(),
            )
        )

    if datum:
        try:
            datum_obj = datetime.strptime(datum, "%Y-%m-%d").date()
            query = query.filter(db.func.date(Jizda.cas_odjezdu) == datum_obj)
        except ValueError:
            return jsonify({"error": "Neplatný formát data (YYYY-MM-DD)"}), 400

    jizdy = query.order_by(Jizda.cas_odjezdu).all()
    jizdy = _filter_rides_by_volna_mista(jizdy, pocet_pasazeru)

    return jsonify({"jizdy": [j.to_dict() for j in jizdy], "celkem": len(jizdy)})


@jizdy_bp.route("/<int:jizda_id>", methods=["GET"])
def get_jizda(jizda_id):
    jizda = db.session.get(Jizda, jizda_id)
    if not jizda:
        return error_response("Jízda nenalezena", 404)
    return jsonify({"jizda": jizda.to_dict()})


@jizdy_bp.route("/", methods=["POST"])
@jwt_required()
def create_jizda():
    """Vytvoří novou jízdu řidiče po kontrole auta, času a kapacity."""
    uzivatel_id = int(get_jwt_identity())
    data, error = get_json_data()
    if error:
        return error

    required_fields = [
        "auto_id",
        "odkud",
        "kam",
        "cas_odjezdu",
        "cas_prijezdu",
        "cena",
        "pocet_mist",
    ]

    for field in required_fields:
        if field not in data:
            return error_response(f"Pole {field} je povinné")

    auto_id, auto_error = parse_positive_int(data.get("auto_id"), "auto_id")
    if auto_error:
        return error_response(auto_error)

    auto = Auto.query.filter_by(
        id=auto_id,
        profil_id=uzivatel_id,
        smazane=False,
    ).first()
    if not auto:
        return error_response("Auto nenalezeno nebo nepatří uživateli", 404)

    ok, odkud = _extract_location_payload(data, "odkud", required=True)
    if not ok:
        return jsonify({"error": odkud}), 400

    ok, kam = _extract_location_payload(data, "kam", required=True)
    if not ok:
        return jsonify({"error": kam}), 400

    ok, mezistanice = _validate_mezistanice_list(data)
    if not ok:
        return jsonify({"error": mezistanice}), 400

    try:
        cas_odjezdu, departure_error = parse_iso_datetime(data.get("cas_odjezdu"), "cas_odjezdu")
        if departure_error:
            return error_response(departure_error)

        cas_prijezdu, arrival_error = parse_iso_datetime(data.get("cas_prijezdu"), "cas_prijezdu")
        if arrival_error:
            return error_response(arrival_error)

        cena, price_error = parse_non_negative_float(data.get("cena"), "cena")
        if price_error:
            return error_response(price_error)

        pocet_mist, seats_error = parse_positive_int(data.get("pocet_mist"), "pocet_mist")
        if seats_error:
            return error_response(seats_error)

        if cas_odjezdu >= cas_prijezdu:
            return error_response("Čas odjezdu musí být před časem příjezdu")
        if cas_odjezdu <= utc_now():
            return error_response("Čas odjezdu musí být v budoucnosti")

        # Řidič by neměl mít dvě prakticky souběžné jízdy, proto hlídáme i krátkou rezervu.
        existing_rides = Jizda.query.filter_by(
            ridic_id=uzivatel_id,
            status="aktivni",
        ).all()
        for existing in existing_rides:
            existing_start = existing.cas_odjezdu
            existing_end = existing.cas_prijezdu
            if not existing_start or not existing_end:
                continue
            if (
                cas_odjezdu < (existing_end + timedelta(minutes=5))
                and cas_prijezdu > (existing_start - timedelta(minutes=5))
            ):
                return error_response("Časy jízd se nesmí krýt a musí mezi nimi být alespoň 5 minut.", 409)

        jizda = Jizda(
            ridic_id=uzivatel_id,
            auto_id=auto_id,
            odkud=odkud["text"],
            kam=kam["text"],
            cas_odjezdu=cas_odjezdu,
            cas_prijezdu=cas_prijezdu,
            cena=cena,
            pocet_mist=pocet_mist,
        )
        jizda.odkud_place_id = odkud["place_id"]
        jizda.odkud_address = odkud["address"]
        jizda.kam_place_id = kam["place_id"]
        jizda.kam_address = kam["address"]

        db.session.add(jizda)
        db.session.flush()

        for i, misto in enumerate(mezistanice, start=1):
            db.session.add(Mezistanice(
                jizda_id=jizda.id,
                misto=misto["text"],
                misto_place_id=misto["place_id"],
                misto_address=misto["address"],
                poradi=i,
            ))

        db.session.commit()
        return jsonify({"message": "Jízda úspěšně vytvořena", "jizda": jizda.to_dict()}), 201
    except Exception:
        db.session.rollback()
        return error_response("Chyba při vytváření jízdy", 500)


@jizdy_bp.route("/<int:jizda_id>", methods=["PUT"])
@jwt_required()
def update_jizda(jizda_id):
    """Upraví aktivní jízdu řidiče bez porušení kapacity a časových pravidel."""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat tuto jízdu"}), 403
    if jizda.status != "aktivni":
        return error_response("Lze upravovat pouze aktivní jízdy")
    if jizda.cas_odjezdu and jizda.cas_odjezdu <= utc_now():
        return error_response("Jízdu už nelze upravit, protože už odjela")

    data, error = get_json_data()
    if error:
        return error
    previous_state = {
        "odkud": jizda.odkud,
        "kam": jizda.kam,
        "cas_odjezdu": jizda.cas_odjezdu,
        "cas_prijezdu": jizda.cas_prijezdu,
        "auto_label": _get_auto_label(jizda.auto),
    }

    try:
        if "auto_id" in data:
            auto_id, auto_error = parse_positive_int(data.get("auto_id"), "auto_id")
            if auto_error:
                return error_response(auto_error)

            auto = Auto.query.filter_by(
                id=auto_id,
                profil_id=uzivatel_id,
                smazane=False,
            ).first()
            if not auto:
                return error_response("Auto nenalezeno nebo nepatří uživateli", 404)
            jizda.auto_id = auto.id

        if "odkud" in data:
            ok, odkud = _extract_location_payload(data, "odkud", required=True)
            if not ok:
                return jsonify({"error": odkud}), 400
            jizda.odkud = odkud["text"]
            jizda.odkud_place_id = odkud["place_id"]
            jizda.odkud_address = odkud["address"]

        if "kam" in data:
            ok, kam = _extract_location_payload(data, "kam", required=True)
            if not ok:
                return jsonify({"error": kam}), 400
            jizda.kam = kam["text"]
            jizda.kam_place_id = kam["place_id"]
            jizda.kam_address = kam["address"]

        if "cena" in data:
            return error_response("Cenu existující jízdy nelze měnit")

        if "pocet_mist" in data:
            new_pocet_mist, seats_error = parse_positive_int(data.get("pocet_mist"), "pocet_mist")
            if seats_error:
                return error_response(seats_error)

            # Kapacitu nenecháme snížit pod již přijatá rezervovaná místa.
            if new_pocet_mist < jizda.get_pocet_prijatych_mist():
                return error_response("Počet míst nemůže být menší než počet již přijatých pasažérů")
            jizda.pocet_mist = new_pocet_mist

        new_cas_odjezdu = jizda.cas_odjezdu
        new_cas_prijezdu = jizda.cas_prijezdu

        if "cas_odjezdu" in data:
            new_cas_odjezdu, departure_error = parse_iso_datetime(data.get("cas_odjezdu"), "cas_odjezdu")
            if departure_error:
                return error_response(departure_error)
        if "cas_prijezdu" in data:
            new_cas_prijezdu, arrival_error = parse_iso_datetime(data.get("cas_prijezdu"), "cas_prijezdu")
            if arrival_error:
                return error_response(arrival_error)

        if new_cas_odjezdu and new_cas_prijezdu:
            if new_cas_odjezdu >= new_cas_prijezdu:
                return error_response("Čas odjezdu musí být před časem příjezdu")
            if new_cas_odjezdu <= utc_now():
                return error_response("Čas odjezdu musí být v budoucnosti")

            existing_rides = Jizda.query.filter_by(
                ridic_id=uzivatel_id,
                status="aktivni",
            ).all()
            for existing in existing_rides:
                if existing.id == jizda.id:
                    continue
                existing_start = existing.cas_odjezdu
                existing_end = existing.cas_prijezdu
                if not existing_start or not existing_end:
                    continue
                if (
                    new_cas_odjezdu < (existing_end + timedelta(minutes=5))
                    and new_cas_prijezdu > (existing_start - timedelta(minutes=5))
                ):
                    return error_response("Časy jízd se nesmí krýt a musí mezi nimi být alespoň 5 minut.", 409)

        jizda.cas_odjezdu = new_cas_odjezdu
        jizda.cas_prijezdu = new_cas_prijezdu

        if "mezistanice" in data:
            # Mezistanice se ukládají jako celé nové pořadí, aby zůstala konzistence trasy.
            ok, mezistanice = _validate_mezistanice_list(data)
            if not ok:
                return jsonify({"error": mezistanice}), 400

            jizda.mezistanice.clear()
            db.session.flush()

            for i, misto in enumerate(mezistanice, start=1):
                jizda.mezistanice.append(Mezistanice(
                    misto=misto["text"],
                    misto_place_id=misto["place_id"],
                    misto_address=misto["address"],
                    poradi=i,
                ))

        changed_labels = _collect_important_ride_changes(jizda, previous_state)

        if changed_labels:
            # Pasažéry upozorňujeme jen na změny, které mají reálný dopad na domluvu cesty.
            labels_text = ", ".join(changed_labels)
            for pasazer in jizda.pasazeri:
                vytvorit_oznameni(
                    pasazer.id,
                    f"Řidič upravil jízdu {jizda.odkud} -> {jizda.kam}. Změnilo se: {labels_text}.",
                    "jizda_zmena",
                    kategorie="jizdy",
                    odesilatel_id=uzivatel_id,
                    target_path=f"/moje-rezervace?focusRide={jizda.id}",
                    jizda_id=jizda.id,
                    commit=False,
                )

        db.session.commit()
        return jsonify({"message": "Jízda úspěšně aktualizována", "jizda": jizda.to_dict()})
    except Exception:
        db.session.rollback()
        return error_response("Chyba při aktualizaci jízdy", 500)


@jizdy_bp.route("/<int:jizda_id>", methods=["DELETE"])
@jwt_required()
def delete_jizda(jizda_id):
    """Zruší jízdu řidiče přes sdílený helper, aby se aplikovala stejná pravidla všude."""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zrušit tuto jízdu"}), 403

    try:
        zrusit_jizdu(jizda)
        route_text = f"{jizda.odkud} → {jizda.kam}"
        for recipient_id in _notification_recipient_ids_for_cancelled_ride(jizda):
            vytvorit_oznameni(
                recipient_id,
                f"Řidič zrušil jízdu {route_text}.",
                "jizda_zrusena",
                kategorie="jizdy",
                odesilatel_id=uzivatel_id,
                target_path=f"/moje-rezervace?focusRide={jizda.id}",
                jizda_id=jizda.id,
                unikatni_klic=f"jizda_zrusena:{jizda.id}:{recipient_id}",
                commit=False,
            )
        db.session.commit()
        return jsonify({"message": "Jízda úspěšně zrušena"})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při rušení jízdy"}), 500


@jizdy_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_jizdy():
    """Vrátí jízdy řidiče i pasažéra a dodělá automatické dokončení po příjezdu."""
    uzivatel_id = int(get_jwt_identity())

    jizdy_ridic = Jizda.query.filter_by(ridic_id=uzivatel_id).all()
    uzivatel = db.session.get(Uzivatel, uzivatel_id)
    jizdy_pasazer = uzivatel.jizdy_pasazer if uzivatel else []
    vsechny_jizdy = jizdy_ridic + list(jizdy_pasazer)

    changed = False
    # Dokončení děláme lazy při čtení, aby se staré aktivní jízdy samy dorovnaly i bez cron jobu.
    for jizda in vsechny_jizdy:
        if jizda.status == "aktivni" and jizda.cas_prijezdu < datetime.now():
            jizda.status = "dokoncena"
            changed = True

    if changed:
        db.session.commit()

    return jsonify([j.to_dict() for j in vsechny_jizdy])


@jizdy_bp.route("/vyhledat", methods=["GET"])
def vyhledat_jizdy():
    """Vrátí jízdy seřazené tak, aby full match měl přednost před partial match."""
    datum = (request.args.get("datum") or "").strip()
    pocet_pasazeru = request.args.get("pocet_pasazeru", type=int) or 1
    odkud_query = _build_search_query_payload("odkud", "odkud_place_id")
    kam_query = _build_search_query_payload("kam", "kam_place_id")

    query = Jizda.query.filter_by(status="aktivni")
    if datum:
        try:
            datum_obj = datetime.strptime(datum, "%Y-%m-%d").date()
            query = query.filter(db.func.date(Jizda.cas_odjezdu) == datum_obj)
        except ValueError:
            return jsonify({"error": "Neplatný formát data (YYYY-MM-DD)"}), 400

    all_rides = query.all()
    full_match = []
    partial_match = []

    # Full a partial match drží frontend odděleně, ale backend určuje prioritu výsledku.
    for ride in all_rides:
        match_type = _classify_ride_match(ride, odkud_query, kam_query)
        if match_type == "full":
            full_match.append(ride)
        elif match_type == "partial":
            partial_match.append(ride)

    result = []
    seen_ids = set()

    for ride in full_match:
        if ride.id in seen_ids or not ride.ma_dostatek_volnych_mist(pocet_pasazeru):
            continue
        seen_ids.add(ride.id)
        result.append({"match_type": "full", "ride": ride.to_dict()})

    for ride in partial_match:
        if ride.id in seen_ids or not ride.ma_dostatek_volnych_mist(pocet_pasazeru):
            continue
        seen_ids.add(ride.id)
        result.append({"match_type": "partial", "ride": ride.to_dict()})

    return jsonify(result)


@jizdy_bp.route("/nejnovejsi", methods=["GET"])
def nejnovejsi_jizdy():
    jizdy = (
        Jizda.query.filter_by(status="aktivni")
        .order_by(Jizda.id.desc())
        .limit(10)
        .all()
    )
    return jsonify([j.to_dict() for j in jizdy])


@jizdy_bp.route("/<int:jizda_id>/pasazeri/<int:pasazer_id>", methods=["DELETE"])
@jwt_required()
def vyhodit_pasazera(jizda_id, pasazer_id):
    """Umožňuje řidiči odebrat pasažéra jen u aktivní jízdy a s časovou rezervou."""
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.status != "aktivni":
        return jsonify({"error": "Pasažéry lze vyhazovat jen u aktivní jízdy."}), 400

    try:
        current_user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"error": "Neplatná identita uživatele v tokenu."}), 401

    if jizda.ridic_id != current_user_id:
        return jsonify({"error": "Nemáš oprávnění vyhazovat pasažéry z této jízdy."}), 403

    now = datetime.now()
    limit_time = jizda.cas_odjezdu - timedelta(hours=1)
    if now > limit_time:
        return jsonify({"error": "Pasažéra lze vyhodit nejpozději 1 hodinu před odjezdem."}), 400

    if pasazer_id == jizda.ridic_id:
        return jsonify({"error": "Řidiče nelze vyhodit z vlastní jízdy."}), 400

    pasazer = next((u for u in jizda.pasazeri if u.id == pasazer_id), None)
    if not pasazer:
        return jsonify({"error": "Uživatel není pasažérem této jízdy."}), 404

    jizda.pasazeri.remove(pasazer)
    rez = Rezervace.query.filter_by(jizda_id=jizda_id, uzivatel_id=pasazer_id).first()
    if rez:
        rez.status = "vyhozen"
        rez.updated_at = datetime.now()

    db.session.commit()
    return jsonify({"message": "Pasažér byl vyhozen."}), 200
