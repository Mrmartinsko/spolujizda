from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.mezistanice import Mezistanice
from models.uzivatel import Uzivatel
from sqlalchemy import or_

jizdy_bp = Blueprint("jizdy", __name__)


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
    mezistanice = [m.strip() for m in mezistanice]
    return True, mezistanice


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

        jizda = Jizda(
            ridic_id=uzivatel_id,
            auto_id=data["auto_id"],
            odkud=data["odkud"],
            kam=data["kam"],
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
    """Aktualizace jízdy (mezistanice: když pošleš -> přepíše se celý seznam)"""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat tuto jízdu"}), 403

    data = request.get_json() or {}

    try:
        if "odkud" in data:
            jizda.odkud = data["odkud"]
        if "kam" in data:
            jizda.kam = data["kam"]
        if "cas_odjezdu" in data:
            jizda.cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        if "cas_prijezdu" in data:
            jizda.cas_prijezdu = datetime.fromisoformat(data["cas_prijezdu"].replace("Z", "+00:00"))
        if "cena" in data:
            jizda.cena = float(data["cena"])
        if "pocet_mist" in data:
            new_pocet_mist = int(data["pocet_mist"])
            if new_pocet_mist < len(jizda.pasazeri):
                return jsonify({"error": "Počet míst nemůže být menší než počet již přijatých pasažérů"}), 400
            jizda.pocet_mist = new_pocet_mist

        # mezistanice: když přijde v payloadu, celé přepíšeme
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
    """Vyhledání jízd podle kritérií (včetně mezistanic)"""
    odkud = request.args.get("odkud", "").strip()
    kam = request.args.get("kam", "").strip()
    datum = request.args.get("datum", "").strip()

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

    for ride in all_rides:
        stops_texts = [m.misto.lower() for m in ride.mezistanice]

        matches_odkud = True
        if odkud:
            o = odkud.lower()
            matches_odkud = (o in ride.odkud.lower()) or any(o in s for s in stops_texts)

        matches_kam = True
        if kam:
            k = kam.lower()
            matches_kam = (k in ride.kam.lower()) or any(k in s for s in stops_texts)

        if matches_odkud and matches_kam:
            full_match.append(ride)
        elif matches_odkud or matches_kam:
            partial_match.append(ride)

    result_rides = full_match + partial_match
    result_rides = [r for r in result_rides if r.get_volna_mista() > 0]

    return jsonify([r.to_dict() for r in result_rides])


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
