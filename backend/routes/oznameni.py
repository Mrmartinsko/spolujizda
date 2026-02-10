from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, jsonify, request
from datetime import datetime
from models import db
from models.oznameni import Oznameni

oznameni_bp = Blueprint("oznameni", __name__)

@oznameni_bp.route("/", methods=["GET"])
@jwt_required()
def ziskat_oznameni():
    uzivatel_id = get_jwt_identity()
    oznameni = Oznameni.query.filter_by(prijemce_id=uzivatel_id).order_by(Oznameni.datum.desc()).all()
    return jsonify([
        {
            "id": o.id,
            "zprava": o.zprava,
            "datum": o.datum.isoformat(),
            "precteno": o.precteno,
            "typ": o.typ,
            "odesilatel_id": o.odesilatel_id
        } for o in oznameni
    ])

@oznameni_bp.route("/<int:oznameni_id>/precist", methods=["POST"])
@jwt_required()
def oznacit_prectene(oznameni_id):
    oznameni = Oznameni.query.get_or_404(oznameni_id)
    current_user_id = get_jwt_identity()

    if oznameni.prijemce_id != int(current_user_id):
        return jsonify({"msg": "Přístup odepřen"}), 403

    oznameni.precteno = True
    db.session.commit()
    return jsonify({"msg": "Oznámení označeno jako přečtené"})

@oznameni_bp.route("/poslat", methods=["POST"])
@jwt_required()
def poslat_oznameni():
    """Endpoint pro poslání oznámení uživateli"""
    data = request.get_json()
    current_user_id = get_jwt_identity()

    if not data.get('prijemce_id') or not data.get('zprava'):
        return jsonify({"msg": "Chybí povinné údaje"}), 400

    try:
        nove_oznameni = Oznameni(
            prijemce_id=data['prijemce_id'],
            odesilatel_id=current_user_id,
            zprava=data['zprava'],
            typ=data.get('typ'),
            datum=datetime.utcnow(),
            precteno=False
        )

        db.session.add(nove_oznameni)
        db.session.commit()

        return jsonify({
            "msg": "Oznámení bylo odesláno",
            "oznameni_id": nove_oznameni.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Chyba při odesílání oznámení: {e}"}), 500

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

def vytvorit_oznameni(prijemce_id, zprava, typ=None, odesilatel_id=None):
    """Pomocná funkce pro vytvoření oznámení z jiných částí aplikace"""
    try:
        # Pokud odesilatel_id nebylo předáno, zkus získat z aktuálního JWT
        if odesilatel_id is None:
            try:
                verify_jwt_in_request()  # ověří, jestli je JWT dostupné
                odesilatel_id = get_jwt_identity()
            except:
                print("Chybí odesilatel_id a nelze získat z JWT")
                return None

        nove_oznameni = Oznameni(
            prijemce_id=prijemce_id,
            odesilatel_id=odesilatel_id,
            zprava=zprava,
            typ=typ,
            datum=datetime.utcnow(),
            precteno=False
        )

        db.session.add(nove_oznameni)
        db.session.commit()

        return nove_oznameni

    except Exception as e:
        db.session.rollback()
        print(f"Chyba při vytváření oznámení: {e}")
        return None


@oznameni_bp.route("/neprectena", methods=["GET"])
@jwt_required()
def ziskat_neprectena():
    uzivatel_id = get_jwt_identity()
    oznameni = Oznameni.query.filter_by(prijemce_id=uzivatel_id, precteno=False).order_by(Oznameni.datum.desc()).all()
    return jsonify([
        {
            "id": o.id,
            "zprava": o.zprava,
            "datum": o.datum.isoformat(),
            "typ": o.typ,
            "odesilatel_id": o.odesilatel_id
        } for o in oznameni
    ])
