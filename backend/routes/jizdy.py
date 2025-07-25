from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.uzivatel import Uzivatel
from sqlalchemy import and_, or_

jizdy_bp = Blueprint("jizdy", __name__)


@jizdy_bp.route("/", methods=["GET"])
def get_jizdy():
    """Získání seznamu jízd s možností filtrování"""
    # Parametry pro filtrování
    odkud = request.args.get("odkud")
    kam = request.args.get("kam")
    datum = request.args.get("datum")
    pocet_pasazeru = request.args.get("pocet_pasazeru", type=int)

    # Základní query
    query = Jizda.query.filter_by(status="aktivni")

    # Aplikace filtrů
    if odkud:
        query = query.filter(Jizda.odkud.ilike(f"%{odkud}%"))

    if kam:
        query = query.filter(Jizda.kam.ilike(f"%{kam}%"))

    if datum:
        try:
            datum_obj = datetime.strptime(datum, "%Y-%m-%d").date()
            query = query.filter(db.func.date(Jizda.cas_odjezdu) == datum_obj)
        except ValueError:
            return jsonify({"error": "Neplatný formát data (YYYY-MM-DD)"}), 400

    if pocet_pasazeru:
        # Filtrování podle volných míst
        query = query.filter(Jizda.pocet_mist >= pocet_pasazeru)

    # Seřazení podle času odjezdu
    jizdy = query.order_by(Jizda.cas_odjezdu).all()

    # Filtrování podle skutečně volných míst
    if pocet_pasazeru:
        jizdy = [j for j in jizdy if j.get_volna_mista() >= pocet_pasazeru]

    return jsonify(
        {"jizdy": [jizda.to_dict() for jizda in jizdy], "celkem": len(jizdy)}
    )


@jizdy_bp.route("/<int:jizda_id>", methods=["GET"])
def get_jizda(jizda_id):
    """Získání detailu jízdy"""
    jizda = Jizda.query.get_or_404(jizda_id)
    return jsonify({"jizda": jizda.to_dict()})


@jizdy_bp.route("/", methods=["POST"])
@jwt_required()
def create_jizda():
    """Vytvoření nové jízdy"""
    uzivatel_id = int(get_jwt_identity())
    data = request.get_json()

    # Validace povinných polí
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
        if not data or field not in data:
            return jsonify({"error": f"Pole {field} je povinné"}), 400

    # Ověření, že auto patří uživateli
    auto = Auto.query.filter_by(id=data["auto_id"], profil_id=uzivatel_id).first()
    if not auto:
        return jsonify({"error": "Auto nenalezeno nebo nepatří uživateli"}), 404

    try:
        # Parsování časů
        cas_odjezdu = datetime.fromisoformat(data["cas_odjezdu"].replace("Z", "+00:00"))
        cas_prijezdu = datetime.fromisoformat(
            data["cas_prijezdu"].replace("Z", "+00:00")
        )

        # Validace časů
        if cas_odjezdu >= cas_prijezdu:
            return jsonify({"error": "Čas odjezdu musí být před časem příjezdu"}), 400

        if cas_odjezdu <= datetime.now():
            return jsonify({"error": "Čas odjezdu musí být v budoucnosti"}), 400

        # Vytvoření jízdy
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
        db.session.commit()

        return jsonify(
            {"message": "Jízda úspěšně vytvořena", "jizda": jizda.to_dict()}
        ), 201

    except ValueError as e:
        return jsonify({"error": "Neplatný formát data nebo času"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při vytváření jízdy"}), 500


@jizdy_bp.route("/<int:jizda_id>", methods=["PUT"])
@jwt_required()
def update_jizda(jizda_id):
    """Aktualizace jízdy"""
    uzivatel_id = int(get_jwt_identity())
    jizda = Jizda.query.get_or_404(jizda_id)

    # Pouze řidič může upravovat svou jízdu
    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění upravovat tuto jízdu"}), 403

    data = request.get_json()

    try:
        # Aktualizace polí
        if "odkud" in data:
            jizda.odkud = data["odkud"]
        if "kam" in data:
            jizda.kam = data["kam"]
        if "cas_odjezdu" in data:
            jizda.cas_odjezdu = datetime.fromisoformat(
                data["cas_odjezdu"].replace("Z", "+00:00")
            )
        if "cas_prijezdu" in data:
            jizda.cas_prijezdu = datetime.fromisoformat(
                data["cas_prijezdu"].replace("Z", "+00:00")
            )
        if "cena" in data:
            jizda.cena = float(data["cena"])
        if "pocet_mist" in data:
            new_pocet_mist = int(data["pocet_mist"])
            # Kontrola, že nový počet míst není menší než počet pasažérů
            if new_pocet_mist < len(jizda.pasazeri):
                return jsonify(
                    {
                        "error": "Počet míst nemůže být menší než počet již přijatých pasažérů"
                    }
                ), 400
            jizda.pocet_mist = new_pocet_mist

        db.session.commit()

        return jsonify(
            {"message": "Jízda úspěšně aktualizována", "jizda": jizda.to_dict()}
        )

    except ValueError:
        return jsonify({"error": "Neplatný formát dat"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při aktualizaci jízdy"}), 500


@jizdy_bp.route("/<int:jizda_id>", methods=["DELETE"])
@jwt_required()
def delete_jizda(jizda_id):
    """Zrušení jízdy"""
    uzivatel_id = int(get_jwt_identity())
    print("JWT identity type:", type(uzivatel_id), "value:", uzivatel_id)
    jizda = Jizda.query.get_or_404(jizda_id)

    # Pouze řidič může zrušit svou jízdu
    if jizda.ridic_id != uzivatel_id:
        return jsonify({"error": "Nemáte oprávnění zrušit tuto jízdu"}), 403

    try:
        jizda.status = "zrusena"
        db.session.commit()

        return jsonify({"message": "Jízda úspěšně zrušena"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Chyba při rušení jízdy"}), 500


@jizdy_bp.route("/moje", methods=["GET"])
@jwt_required()
def get_moje_jizdy():
    """Získání jízd aktuálního uživatele"""
    uzivatel_id = int(get_jwt_identity())
    # Jízdy jako řidič
    jizdy_ridic = Jizda.query.filter_by(ridic_id=uzivatel_id).all()

    # Jízdy jako pasažér
    uzivatel = Uzivatel.query.get(uzivatel_id)
    jizdy_pasazer = uzivatel.jizdy_pasazer if uzivatel else []

    # Kombinace obou seznamů
    print(jizdy_ridic[0].to_dict())
    vsechny_jizdy = jizdy_ridic + list(jizdy_pasazer)

    return jsonify([jizda.to_dict() for jizda in vsechny_jizdy])


@jizdy_bp.route("/vyhledat", methods=["GET"])
def vyhledat_jizdy():
    """Vyhledání jízd podle kritérií"""
    odkud = request.args.get("odkud", "").strip()
    kam = request.args.get("kam", "").strip()
    datum = request.args.get("datum", "").strip()
    print(odkud, kam, datum)

    # Základní query - pouze aktivní jízdy
    query = Jizda.query.filter_by(status="aktivni")

    # Filtrování podle místa odjezdu
    if odkud:
        query = query.filter(Jizda.odkud.ilike(f"%{odkud}%"))

    # Filtrování podle cíle
    if kam:
        query = query.filter(Jizda.kam.ilike(f"%{kam}%"))

    # Filtrování podle data
    if datum:
        try:
            datum_obj = datetime.strptime(datum, "%Y-%m-%d").date()
            query = query.filter(db.func.date(Jizda.cas_odjezdu) == datum_obj)
        except ValueError:
            return jsonify({"error": "Neplatný formát data (YYYY-MM-DD)"}), 400

    # Seřazení podle času odjezdu
    jizdy = query.order_by(Jizda.cas_odjezdu).all()

    # Filtrování pouze jízd s volnými místy
    jizdy_s_misty = [j for j in jizdy if j.get_volna_mista() > 0]

    return jsonify([jizda.to_dict() for jizda in jizdy_s_misty])
