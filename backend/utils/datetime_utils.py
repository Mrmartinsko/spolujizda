from datetime import UTC, datetime


def utc_now():
    """Vrati aktualni UTC cas bez tzinfo pro kompatibilitu se stavajicimi DB sloupci."""
    return datetime.now(UTC).replace(tzinfo=None)
