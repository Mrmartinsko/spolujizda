from datetime import datetime, timedelta
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.mezistanice import Mezistanice
from models.uzivatel import Uzivatel
from sqlalchemy import or_
from models.rezervace import Rezervace


jizdy_bp = Blueprint("jizdy", __name__)


def _validate_location_field(value, field_name):
    if not isinstance(value, str):
        return False, f"Pole {field_name} musí být text"

    normalized = value.strip()
    if not normalized:
        return False, f"Pole {field_name} je povinné"
    if len(normalized) > 15:
        return False, f"Pole {field_name} může mít maximálně 15 znaků"
    if re.search(r"[^A-Za-zÀ-ž0-9\s-]", normalized):
        return False, f"Pole {field_name} může obsahovat jen písmena a maximálně dvě čísla"
    if len(re.findall(r"\d", normalized)) > 2:
        return False, f"Pole {field_name} může obsahovat maximálně dvě čísla"

    return True, normalized


def _validate_mezistanice_list(data):
    """
    Vrátí (ok, mezistanice_or_error_message).
    mezistanice jsou nepovinné -> default []
    """
    mezistanice = data.get("mezistanice", [])
    if mezistanice is None:
        mezistanice = []

    if not isinstance(mezistanice, list):
        return False, "mezistanice musí být seznam textů"

    for m in mezistanice:
        if (not isinstance(m, str)) or (not m.strip()):
            return False, "mezistanice musí být seznam neprázdných textů"

    # strip + zachovat pořadí
    normalized_stops = []
    for m in mezistanice:
        ok, validated = _validate_location_field(m, "mezistanice")
        if not ok:
            return False, validated
        normalized_stops.append(validated)
    return True, normalized_stops


@jizdy_bp.route("/", methods=["GET"])
def get_jizdy():
    """Získání seznamu jízd s možností filtrování"""
    odkud = request.args.get("odkud")
    kam = request.args.get("kam")
    datum = request.args.get("datum")
    pocet_pasazeru = request.args.get("pocet_pasazeru", type=int)

    query = Jizda.query.filter_by(status="aktivni")

    # odkud přes jizda.odkud nebo mezistanice.misto
    if odkud:
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

    # kam přes jizda.kam nebo mezistanice.misto
    if kam:
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

    if pocet_pasazeru:
        query = query.filter(Jizda.pocet_mist >= pocet_pasazeru)

    jizdy = query.order_by(Jizda.cas_odjezdu).all()

    if pocet_pasazeru:
        jizdy = [j for j in jizdy if j.get_volna_mista() >= pocet_pasazeru]

    return jsonify({"jizdy": [j.to_dict() for j in jizdy], "celkem": len(jizdy)})


@jizdy_bp.route("/<int:jizda_id>", methods=["GET"])
def get_jizda(jizda_id):
    """Získání detailu jízdy"""
    jizda = Jizda.query.get_or_404(jizda_id)
    return jsonify({"jizda": jizda.to_dict()})


@jizdy_bp.route("/", methods=["POST"])
@jwt_required()
def create_jizda():
    """Vytvoření nové jízdy (mezistanice nepovinné)"""
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
            return jsonify({"error": f"Pole {field} je povinné"}), 400

    # ověř auto
    auto = Auto.query.filter_by(
        id=data["auto_id"],
        profil_id=uzivatel_id,
        smazane=False
    ).first()
    if not auto:
        return jsonify({"error": "Auto nenalezeno nebo nepatří uživateli"}), 404

    ok, odkud = _validate_location_field(data.get("odkud"), "odkud")
    if not ok:
        return jsonify({"error": odkud}), 400

    ok, kam = _validate_location_field(data.get("kam"), "kam")
    if not ok:
        return jsonify({"error": kam}), 400

    ok, mezistanice = _validate_mezistanice_list(data)
    if not ok:
        return jsonify({"error": mezistanice}), 400

    try:
        cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        cas_prijezdu = datetime.fromisoformat(data["cas_prijezdu"].replace("Z", "+00:00"))

        if cas_odjezdu >= cas_prijezdu:
            return jsonify({"error": "Čas odjezdu musí být před časem příjezdu"}), 400

        if cas_odjezdu <= datetime.now():
            return jsonify({"error": "Čas odjezdu musí být v budoucnosti"}), 400

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
                return jsonify({"error": "Časy jízd se nesmí krýt a musí mezi nimi být alespoň 5 minut."}), 409

        jizda = Jizda(
            ridic_id=uzivatel_id,
            auto_id=data["auto_id"],
            odkud=odkud,
            kam=kam,
            cas_odjezdu=cas_odjezdu,
            cas_prijezdu=cas_prijezdu,
            cena=float(data["cena"]),
            pocet_mist=int(data["pocet_mist"]),
        )

        db.session.add(jizda)
        db.session.flush()  # získáme jizda.id bez commitu

        # uložit mezistanice (pokud existují)
        for i, misto in enumerate(mezistanice, start=1):
            db.session.add(Mezistanice(
                jizda_id=jizda.id,
                misto=misto,
                poradi=i
            ))

        db.session.commit()
        return jsonify({"message": "Jízda úspěšně vytvořena", "jizda": jizda.to_dict()}), 201

    except ValueError:
        return jsonify({"error": "Neplatný formát data nebo času"}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření jízdy"}), 500


@jizdy_bp.route("/<int:jizda_id>", methods=["PUT"])
@jwt_required()
def update_jizda(jizda_id):
    """Aktualizace jízdy:
    - povoleno jen pro aktivní jízdu, která ještě neodjela
    - auto_id lze změnit (jen na nesmazané auto uživatele)
    - mezistanice: když pošleš -> přepíše se celý seznam
    - pocet_mist nesmí být < počet přijatých pasažérů
    """
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat tuto jízdu"}), 403

    # ✅ editace jen pro aktivní jízdy
    if jizda.status != "aktivni":
        return jsonify({"error": "Lze upravovat pouze aktivní jízdy"}), 400

    # ✅ editace jen dokud jízda ještě neodjela
    if jizda.cas_odjezdu and jizda.cas_odjezdu <= datetime.now():
        return jsonify({"error": "Jízdu už nelze upravit, protože už odjela"}), 400

    data = request.get_json() or {}

    try:
        # --- AUTO (volitelné) ---
        if "auto_id" in data:
            auto = Auto.query.filter_by(
                id=data["auto_id"],
                profil_id=uzivatel_id,
                smazane=False
            ).first()
            if not auto:
                return jsonify({"error": "Auto nenalezeno nebo nepatří uživateli"}), 404
            jizda.auto_id = auto.id

        # --- BASIC FIELDS ---
        if "odkud" in data:
            ok, odkud = _validate_location_field(data.get("odkud"), "odkud")
            if not ok:
                return jsonify({"error": odkud}), 400
            jizda.odkud = odkud
        if "kam" in data:
            ok, kam = _validate_location_field(data.get("kam"), "kam")
            if not ok:
                return jsonify({"error": kam}), 400
            jizda.kam = kam
        if "cena" in data:
            jizda.cena = float(data["cena"])

        # --- POCET MIST ---
        if "pocet_mist" in data:
            new_pocet_mist = int(data["pocet_mist"])
            if new_pocet_mist < len(jizda.pasazeri):
                return jsonify({"error": "Počet míst nemůže být menší než počet již přijatých pasažérů"}), 400
            jizda.pocet_mist = new_pocet_mist

        # --- TIMES ---
        # vezmeme současné a případně přepíšeme těmi z payloadu
        new_cas_odjezdu = jizda.cas_odjezdu
        new_cas_prijezdu = jizda.cas_prijezdu

        if "cas_odjezdu" in data:
            new_cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        if "cas_prijezdu" in data:
            new_cas_prijezdu = datetime.fromisoformat(data["cas_prijezdu"].replace("Z", "+00:00"))

        # validace času (když existují)
        if new_cas_odjezdu and new_cas_prijezdu:
            if new_cas_odjezdu >= new_cas_prijezdu:
                return jsonify({"error": "Čas odjezdu musí být před časem příjezdu"}), 400
            if new_cas_odjezdu <= datetime.now():
                return jsonify({"error": "Čas odjezdu musí být v budoucnosti"}), 400

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
                    return jsonify({"error": "Časy jízd se nesmí krýt a musí mezi nimi být alespoň 5 minut."}), 409

        jizda.cas_odjezdu = new_cas_odjezdu
        jizda.cas_prijezdu = new_cas_prijezdu

        # --- MEZISTANICE (přepíše celý seznam) ---
        if "mezistanice" in data:
            ok, mezistanice = _validate_mezistanice_list(data)
            if not ok:
                return jsonify({"error": mezistanice}), 400

            jizda.mezistanice.clear()
            db.session.flush()

            for i, misto in enumerate(mezistanice, start=1):
                jizda.mezistanice.append(Mezistanice(
                    misto=misto,
                    poradi=i
                ))

        db.session.commit()
        return jsonify({"message": "Jízda úspěšně aktualizována", "jizda": jizda.to_dict()})

    except ValueError:
        return jsonify({"error": "Neplatný formát dat"}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci jízdy"}), 500

@jizdy_bp.route("/<int:jizda_id>", methods=["DELETE"])
@jwt_required()
def delete_jizda(jizda_id):
    """Zrušení jízdy"""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zrušit tuto jízdu"}), 403

    try:
        jizda.status = "zrusena"
        db.session.commit()
        return jsonify({"message": "Jízda úspěšně zrušena"})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Chyba při rušení jízdy"}), 500


@jizdy_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_jizdy():
    """Získání jízd aktuálního uživatele"""
    uzivatel_id = int(get_jwt_identity())

    jizdy_ridic = Jizda.query.filter_by(ridic_id=uzivatel_id).all()

    uzivatel = Uzivatel.query.get(uzivatel_id)
    jizdy_pasazer = uzivatel.jizdy_pasazer if uzivatel else []

    vsechny_jizdy = jizdy_ridic + list(jizdy_pasazer)

    for j in vsechny_jizdy:
        if j.status == "aktivni" and j.cas_prijezdu < datetime.now():
            j.status = "dokoncena"
            db.session.commit()

    return jsonify([j.to_dict() for j in vsechny_jizdy])


@jizdy_bp.route("/vyhledat", methods=["GET"])
def vyhledat_jizdy():
    """Vyhledání jízd podle kritérií (včetně mezistanic) + pořadí zastávek
    - full: odkud i kam jsou na trase a odkud je před kam (v pořadí zastávek)
    - partial: sedí jen odkud nebo jen kam (kdekoli na trase)
    - full výsledky jsou vždy nahoře, partial pod nimi
    - vrací [{"match_type": "full"|"partial", "ride": {...}}, ...]
    - filtruje podle volných míst >= pocet_pasazeru
    """
    odkud = request.args.get("odkud", "").strip()
    kam = request.args.get("kam", "").strip()
    datum = request.args.get("datum", "").strip()
    pocet_pasazeru = request.args.get("pocet_pasazeru", type=int) or 1

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

    o = odkud.lower() if odkud else ""
    k = kam.lower() if kam else ""

    for ride in all_rides:
        # trasa v pořadí: odkud -> mezistanice (podle poradi) -> kam
        stops_sorted = sorted(list(ride.mezistanice), key=lambda m: (m.poradi or 0))
        route = [ride.odkud] + [m.misto for m in stops_sorted] + [ride.kam]
        route_lower = [s.lower() for s in route if s]

        # najdi pozice (substring match)
        odkud_positions = []
        kam_positions = []

        if o:
            odkud_positions = [i for i, s in enumerate(route_lower) if o in s]
        if k:
            kam_positions = [i for i, s in enumerate(route_lower) if k in s]

        # když není vyplněné odkud/kam, ber jako "match"
        matches_odkud_anywhere = True if not o else (len(odkud_positions) > 0)
        matches_kam_anywhere = True if not k else (len(kam_positions) > 0)

        # full match jen když oboje existuje + správné pořadí (nějaké i < j)
        matches_both_in_order = False
        if o and k and odkud_positions and kam_positions:
            matches_both_in_order = any(i < j for i in odkud_positions for j in kam_positions)
        elif (o and not k) or (k and not o):
            # full match nedává smysl, když je vyplněné jen jedno pole
            matches_both_in_order = False
        elif (not o) and (not k):
            # když není nic vyplněno, nechceme full match, ať se to nechová divně
            matches_both_in_order = False

        # rozřazení
        if matches_both_in_order:
            full_match.append(ride)
        elif matches_odkud_anywhere or matches_kam_anywhere:
            # partial = aspoň jedno sedí kdekoliv na trase
            # (když je vyplněné oboje, ale pořadí nesedí, spadne to sem)
            partial_match.append(ride)

    # full nahoře, partial pod tím, bez duplicit + filtr volných míst
    result = []
    seen_ids = set()

    for r in full_match:
        if r.id in seen_ids:
            continue
        if r.get_volna_mista() < pocet_pasazeru:
            continue
        seen_ids.add(r.id)
        result.append({
            "match_type": "full",
            "ride": r.to_dict(),
        })

    for r in partial_match:
        if r.id in seen_ids:
            continue
        if r.get_volna_mista() < pocet_pasazeru:
            continue
        seen_ids.add(r.id)
        result.append({
            "match_type": "partial",
            "ride": r.to_dict(),
        })

    return jsonify(result)



@jizdy_bp.route("/nejnovejsi", methods=["GET"])
def nejnovejsi_jizdy():
    """Vrátí 10 nejnovějších jízd, bez ohledu na místo"""
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
    current_user_id = get_jwt_identity()

    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.status != "aktivni":
        return jsonify({"error": "Pasažéry lze vyhazovat jen u aktivní jízdy."}), 400

    current_user_id = get_jwt_identity()
    try:
        current_user_id = int(current_user_id)
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
 
    # pasazer uvidi u stavu rezervace vyhozen
    rez = Rezervace.query.filter_by(jizda_id=jizda_id,uzivatel_id=pasazer_id).first()

    if rez:
        rez.status = "vyhozen" 
        rez.updated_at = datetime.now()  


    db.session.commit()

    return jsonify({"message": "Pasažér byl vyhozen."}), 200
