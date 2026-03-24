import json
import hashlib
from functools import lru_cache
from pathlib import Path

from utils.text_normalization import normalize_search_text


BASE_DIR = Path(__file__).resolve().parents[1]
CITIES_JSON_PATH = BASE_DIR / "data" / "cities.json"
RESULT_LIMIT = 10


def build_place_id(name, address):
    digest = hashlib.sha1(
        f"{normalize_search_text(name)}|{normalize_search_text(address)}".encode("utf-8")
    ).hexdigest()
    return f"city_{digest[:16]}"


def get_city_display_name(name):
    normalized_name = (name or "").strip()
    if normalized_name.lower().startswith("město "):
        return normalized_name[6:].strip()
    if normalized_name.lower().startswith("mesto "):
        return normalized_name[6:].strip()
    return normalized_name


@lru_cache(maxsize=1)
def load_cities():
    if not CITIES_JSON_PATH.exists():
        return []

    with CITIES_JSON_PATH.open("r", encoding="utf-8") as cities_file:
        raw_data = json.load(cities_file)

    cities = []
    for item in raw_data:
        if not isinstance(item, dict):
            continue

        name = (item.get("name") or "").strip()
        address = (item.get("address") or "").strip()
        if not name:
            continue

        cities.append({
            "place_id": build_place_id(name, address),
            "name": name,
            "display_name": get_city_display_name(name),
            "address": address,
            "_search_name": normalize_search_text(name),
            "_search_address": normalize_search_text(address),
        })

    return cities


def search_cities(query, *, include_address=True, limit=RESULT_LIMIT):
    normalized_query = normalize_search_text(query)
    if len(normalized_query) < 2:
        return []

    matches = []
    for city in load_cities():
        in_name = normalized_query in city["_search_name"]
        in_address = include_address and normalized_query in city["_search_address"]
        if not in_name and not in_address:
            continue

        matches.append({
            "place_id": city["place_id"],
            "name": city["name"],
            "display_name": city["display_name"],
            "address": city["address"],
        })

        if len(matches) >= limit:
            break

    return matches


@lru_cache(maxsize=1)
def load_cities_by_place_id():
    return {city["place_id"]: city for city in load_cities()}


def get_city_by_place_id(place_id):
    if not place_id:
        return None
    return load_cities_by_place_id().get(place_id)
