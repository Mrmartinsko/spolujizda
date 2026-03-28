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
from utils.cities import get_city_by_place_id
from utils.jizdy import zrusit_jizdu
from utils.text_normalization import normalize_search_text, sanitize_location_text


jizdy_bp = Blueprint("jizdy", __name__)


LOCATION_ALLOWED_RE = re.compile(r"[^A-Za-zÀ-ž0-9\s-]")


def _validate_location_field(value, field_name):
    if not isinstance(value, str):
        return False, f"Pole {field_name} musi byt text"

    normalized = sanitize_location_text(value)
    if not normalized:
        return False, f"Pole {field_name} je povinne"
    if len(normalized) > 50:
        return False, f"Pole {field_name} muze mit maximalne 50 znaku"
    if LOCATION_ALLOWED_RE.search(normalized):
        return False, f"Pole {field_name} muze obsahovat jen pismena, cisla, mezery a pomlcky"

    return True, normalized


def _extract_location_payload(data, field_name, *, required):
    raw_text = data.get(field_name)
    if raw_text is None:
        if required:
            return False, f"Pole {field_name} je povinne"
        return True, None

    ok, text_value = _validate_location_field(raw_text, field_name)
    if not ok:
        return False, text_value

    place_id = (data.get(f"{field_name}_place_id") or "").strip() or None
    city = get_city_by_place_id(place_id) if place_id else None

    if place_id and not city:
        return False, f"Pole {field_name} obsahuje neplatnou lokalitu"

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
    raw_stops = data.get("mezistanice", [])
    if raw_stops is None:
        return True, []
    if not isinstance(raw_stops, list):
        return False, "mezistanice musi byt seznam"

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
            return False, "mezistanice musi byt seznam textu nebo objektu"

        stop_payload = {
            "mezistanice": item.get("text") or item.get("misto"),
            "mezistanice_place_id": item.get("place_id") or item.get("misto_place_id"),
        }
        ok, parsed = _extract_location_payload(stop_payload, "mezistanice", required=True)
        if not ok:
            return False, parsed
        normalized_stops.append(parsed)

    return True, normalized_stops


def _route_points_for_ride(ride):
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
    if not query:
        return False

    query_place_id = query.get("place_id")
    if query_place_id:
        return query_place_id == point.get("place_id")

    query_text = normalize_search_text(query.get("text"))
    point_text = normalize_search_text(point.get("text"))
    return bool(query_text and point_text and query_text in point_text)


def _build_search_query_payload(text_key, place_id_key):
    text_value = (request.args.get(text_key) or "").strip()
    place_id_value = (request.args.get(place_id_key) or "").strip() or None
    if not text_value and not place_id_value:
        return None
    return {
        "text": text_value,
        "place_id": place_id_value,
    }


def _classify_ride_match(ride, odkud_query, kam_query):
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
    return [jizda for jizda in jizdy if jizda.ma_dostatek_volnych_mist(pocet_pasazeru)]


@jizdy_bp.route("/", methods=["GET"])
def get_jizdy():
    """Simple listing filter.

    This endpoint intentionally stays as a lighter filter than /vyhledat.
    If place_id is present, it uses exact place matching. Otherwise it falls
    back to text search for simple browsing.
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
            return jsonify({"error": "Neplatny format data (YYYY-MM-DD)"}), 400

    jizdy = query.order_by(Jizda.cas_odjezdu).all()
    jizdy = _filter_rides_by_volna_mista(jizdy, pocet_pasazeru)

    return jsonify({"jizdy": [j.to_dict() for j in jizdy], "celkem": len(jizdy)})


@jizdy_bp.route("/<int:jizda_id>", methods=["GET"])
def get_jizda(jizda_id):
    jizda = Jizda.query.get_or_404(jizda_id)
    return jsonify({"jizda": jizda.to_dict()})


@jizdy_bp.route("/", methods=["POST"])
@jwt_required()
def create_jizda():
    uzivatel_id = int(get_jwt_identity())
    data = request.get_json() or {}

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
            return jsonify({"error": f"Pole {field} je povinne"}), 400

    auto = Auto.query.filter_by(
        id=data["auto_id"],
        profil_id=uzivatel_id,
        smazane=False,
    ).first()
    if not auto:
        return jsonify({"error": "Auto nenalezeno nebo nepatri uzivateli"}), 404

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
        cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        cas_prijezdu = datetime.fromisoformat(data["cas_prijezdu"].replace("Z", "+00:00"))

        if cas_odjezdu >= cas_prijezdu:
            return jsonify({"error": "Cas odjezdu musi byt pred casem prijezdu"}), 400
        if cas_odjezdu <= datetime.now():
            return jsonify({"error": "Cas odjezdu musi byt v budoucnosti"}), 400

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
                return jsonify({"error": "Casy jizd se nesmi kryt a musi mezi nimi byt alespon 5 minut."}), 409

        jizda = Jizda(
            ridic_id=uzivatel_id,
            auto_id=data["auto_id"],
            odkud=odkud["text"],
            kam=kam["text"],
            cas_odjezdu=cas_odjezdu,
            cas_prijezdu=cas_prijezdu,
            cena=float(data["cena"]),
            pocet_mist=int(data["pocet_mist"]),
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
        return jsonify({"message": "Jizda uspesne vytvorena", "jizda": jizda.to_dict()}), 201
    except ValueError:
        return jsonify({"error": "Neplatny format data nebo casu"}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri vytvareni jizdy"}), 500


@jizdy_bp.route("/<int:jizda_id>", methods=["PUT"])
@jwt_required()
def update_jizda(jizda_id):
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemate opravneni upravovat tuto jizdu"}), 403
    if jizda.status != "aktivni":
        return jsonify({"error": "Lze upravovat pouze aktivni jizdy"}), 400
    if jizda.cas_odjezdu and jizda.cas_odjezdu <= datetime.now():
        return jsonify({"error": "Jizdu uz nelze upravit, protoze uz odjela"}), 400

    data = request.get_json() or {}

    try:
        if "auto_id" in data:
            auto = Auto.query.filter_by(
                id=data["auto_id"],
                profil_id=uzivatel_id,
                smazane=False,
            ).first()
            if not auto:
                return jsonify({"error": "Auto nenalezeno nebo nepatri uzivateli"}), 404
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
            return jsonify({"error": "Cenu existujici jizdy nelze menit"}), 400

        if "pocet_mist" in data:
            new_pocet_mist = int(data["pocet_mist"])
            if new_pocet_mist < jizda.get_pocet_prijatych_mist():
                return jsonify({"error": "Pocet mist nemuze byt mensi nez pocet jiz prijatych pasazeru"}), 400
            jizda.pocet_mist = new_pocet_mist

        new_cas_odjezdu = jizda.cas_odjezdu
        new_cas_prijezdu = jizda.cas_prijezdu

        if "cas_odjezdu" in data:
            new_cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        if "cas_prijezdu" in data:
            new_cas_prijezdu = datetime.fromisoformat(data["cas_prijezdu"].replace("Z", "+00:00"))

        if new_cas_odjezdu and new_cas_prijezdu:
            if new_cas_odjezdu >= new_cas_prijezdu:
                return jsonify({"error": "Cas odjezdu musi byt pred casem prijezdu"}), 400
            if new_cas_odjezdu <= datetime.now():
                return jsonify({"error": "Cas odjezdu musi byt v budoucnosti"}), 400

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
                    return jsonify({"error": "Casy jizd se nesmi kryt a musi mezi nimi byt alespon 5 minut."}), 409

        jizda.cas_odjezdu = new_cas_odjezdu
        jizda.cas_prijezdu = new_cas_prijezdu

        if "mezistanice" in data:
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

        db.session.commit()
        return jsonify({"message": "Jizda uspesne aktualizovana", "jizda": jizda.to_dict()})
    except ValueError:
        return jsonify({"error": "Neplatny format dat"}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri aktualizaci jizdy"}), 500


@jizdy_bp.route("/<int:jizda_id>", methods=["DELETE"])
@jwt_required()
def delete_jizda(jizda_id):
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemate opravneni zrusit tuto jizdu"}), 403

    try:
        zrusit_jizdu(jizda)
        db.session.commit()
        return jsonify({"message": "Jizda uspesne zrusena"})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba pri ruseni jizdy"}), 500


@jizdy_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_jizdy():
    uzivatel_id = int(get_jwt_identity())

    jizdy_ridic = Jizda.query.filter_by(ridic_id=uzivatel_id).all()
    uzivatel = Uzivatel.query.get(uzivatel_id)
    jizdy_pasazer = uzivatel.jizdy_pasazer if uzivatel else []
    vsechny_jizdy = jizdy_ridic + list(jizdy_pasazer)

    changed = False
    for jizda in vsechny_jizdy:
        if jizda.status == "aktivni" and jizda.cas_prijezdu < datetime.now():
            jizda.status = "dokoncena"
            changed = True

    if changed:
        db.session.commit()

    return jsonify([j.to_dict() for j in vsechny_jizdy])


@jizdy_bp.route("/vyhledat", methods=["GET"])
def vyhledat_jizdy():
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
            return jsonify({"error": "Neplatny format data (YYYY-MM-DD)"}), 400

    all_rides = query.all()
    full_match = []
    partial_match = []

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
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.status != "aktivni":
        return jsonify({"error": "Pasazery lze vyhazovat jen u aktivni jizdy."}), 400

    try:
        current_user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"error": "Neplatna identita uzivatele v tokenu."}), 401

    if jizda.ridic_id != current_user_id:
        return jsonify({"error": "Nemas opravneni vyhazovat pasazery z teto jizdy."}), 403

    now = datetime.now()
    limit_time = jizda.cas_odjezdu - timedelta(hours=1)
    if now > limit_time:
        return jsonify({"error": "Pasazera lze vyhodit nejpozdeji 1 hodinu pred odjezdem."}), 400

    if pasazer_id == jizda.ridic_id:
        return jsonify({"error": "Ridice nelze vyhodit z vlastni jizdy."}), 400

    pasazer = next((u for u in jizda.pasazeri if u.id == pasazer_id), None)
    if not pasazer:
        return jsonify({"error": "Uzivatel neni pasazerem teto jizdy."}), 404

    jizda.pasazeri.remove(pasazer)
    rez = Rezervace.query.filter_by(jizda_id=jizda_id, uzivatel_id=pasazer_id).first()
    if rez:
        rez.status = "vyhozen"
        rez.updated_at = datetime.now()

    db.session.commit()
    return jsonify({"message": "Pasazer byl vyhozen."}), 200
