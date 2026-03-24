from flask import Blueprint, jsonify, request

from utils.cities import search_cities


mesta_bp = Blueprint("mesta", __name__)


@mesta_bp.route("", methods=["GET"])
def get_mesta():
    query = (request.args.get("q") or "").strip()
    include_address = request.args.get("search_address", "1").strip().lower() not in {"0", "false", "no"}

    if len(query) < 2:
        return jsonify([])

    return jsonify(search_cities(query, include_address=include_address, limit=10))
