from datetime import UTC, datetime

from flask import jsonify, request
from werkzeug.exceptions import BadRequest


def error_response(message, status_code=400):
    return jsonify({"error": message}), status_code


def get_json_data():
    """Safely load JSON object payloads and keep error responses consistent."""
    if not request.is_json:
        return None, error_response("Request musi obsahovat JSON")

    try:
        data = request.get_json()
    except BadRequest:
        return None, error_response("Neplatny JSON")

    if data is None:
        return None, error_response("Request musi obsahovat JSON")
    if not isinstance(data, dict):
        return None, error_response("JSON payload musi byt objekt")

    return data, None


def get_str_field(data, field_name, *, required=False, max_length=None):
    value = data.get(field_name)

    if value is None:
        if required:
            return None, f"Pole {field_name} je povinne"
        return None, None

    if not isinstance(value, str):
        return None, f"Pole {field_name} musi byt text"

    cleaned = value.strip()
    if required and not cleaned:
        return None, f"Pole {field_name} je povinne"

    if max_length is not None and len(cleaned) > max_length:
        return None, f"Pole {field_name} muze mit maximalne {max_length} znaku"

    return cleaned, None


def parse_positive_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, f"Pole {field_name} musi byt cele cislo"

    if parsed <= 0:
        return None, f"Pole {field_name} musi byt vetsi nez 0"

    return parsed, None


def parse_non_negative_float(value, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None, f"Pole {field_name} musi byt cislo"

    if parsed < 0:
        return None, f"Pole {field_name} musi byt vetsi nebo rovno 0"

    return parsed, None


def parse_iso_datetime(value, field_name):
    if value is None:
        return None, f"Pole {field_name} je povinne"
    if not isinstance(value, str):
        return None, f"Pole {field_name} musi byt text ve formatu ISO"

    cleaned = value.strip()
    if not cleaned:
        return None, f"Pole {field_name} je povinne"

    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError:
        return None, f"Pole {field_name} ma neplatny format data a casu"

    # Datetimes v DB jsou naivni, proto timezone-aware vstup normalizujeme na UTC bez tzinfo.
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(UTC).replace(tzinfo=None)

    return parsed, None
