import re


def validate_email(email):
    """Validace emailove adresy"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validace hesla - minimalne 6 znaku"""
    return len(password) >= 6


def validate_phone(phone):
    """Validace telefonniho cisla"""
    if not phone:
        return False

    cleaned = phone.strip()
    # Napr. +420 123 456 789, +420123456789, 123 456 789, +420-123-456-789
    pattern = r"^(?:\+\d{1,3}[\s-]?)?(?:\d{3}[\s-]?){2}\d{3}$"
    return re.match(pattern, cleaned) is not None


def validate_spz(spz):
    """Validace SPZ"""
    if not spz:
        return True

    pattern = r"^[A-Z0-9]{1,4}\s?[A-Z0-9]{0,4}$"
    return re.match(pattern, spz.upper()) is not None
