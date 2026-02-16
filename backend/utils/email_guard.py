from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.uzivatel import Uzivatel

def email_verified_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        uzivatel = Uzivatel.query.get(int(user_id)) if user_id else None

        if not uzivatel:
            return jsonify({"error": "Uživatel nenalezen"}), 404

        if not uzivatel.email_verified:
            return jsonify({"error": "Nejdřív ověř email"}), 403

        return fn(*args, **kwargs)
    return wrapper
