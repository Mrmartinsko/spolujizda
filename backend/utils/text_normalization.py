import re
import unicodedata


LOCATION_ALLOWED_RE = re.compile(r"[^A-Za-zÀ-ž0-9\s-]")


def normalize_search_text(value):
    if not isinstance(value, str):
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    without_diacritics = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(without_diacritics.casefold().split())


def sanitize_location_text(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().split())
