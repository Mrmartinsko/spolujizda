import re


def validate_email(email):
    """Validace emailové adresy"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validace hesla - minimálně 6 znaků"""
    return len(password) >= 6


def validate_phone(phone):
    """Validace telefonního čísla"""
    pattern = r"^\+?[1-9]\d{1,14}$"
    return re.match(pattern, phone) is not None


def validate_spz(spz):
    """Validace SPZ"""
    if not spz:
        return True  # SPZ není povinná

    # Český formát SPZ (např. 1A2 3456 nebo 1AB 2345)
    pattern = r"^[A-Z0-9]{1,4}\s?[A-Z0-9]{0,4}$"
    return re.match(pattern, spz.upper()) is not None
