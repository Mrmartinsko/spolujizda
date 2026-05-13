from datetime import timedelta

import pytest

from models import db
from models.profil import Profil
from models.uzivatel import Uzivatel
from utils.datetime_utils import utc_now


def _error_text(response):
    data = response.get_json()
    return data.get("error") or data.get("msg")


def test_register_success(client, mock_emails):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "novy@example.com",
            "password": "tajneheslo",
            "jmeno": "Novy Uzivatel",
            "telefon": "+420 123 456 789",
            "bio": "Ahoj",
        },
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["requires_email_verification"] is True
    uzivatel = Uzivatel.query.filter_by(email="novy@example.com").first()
    assert uzivatel is not None
    assert uzivatel.email_verified is False
    assert uzivatel.email_verification_token is not None
    assert uzivatel.profil.jmeno == "Novy Uzivatel"
    assert len(mock_emails) == 1
    assert mock_emails[0]["type"] == "verification"


@pytest.mark.parametrize("field", ["email", "password", "jmeno", "telefon"])
def test_register_missing_required_fields(client, field):
    payload = {
        "email": "novy@example.com",
        "password": "tajneheslo",
        "jmeno": "Novy Uzivatel",
        "telefon": "+420 123 456 789",
    }
    payload.pop(field)

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 400
    assert field in _error_text(response)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("email", " "),
        ("password", " "),
        ("jmeno", " "),
        ("telefon", " "),
    ],
)
def test_register_blank_required_fields(client, field, value):
    payload = {
        "email": "novy@example.com",
        "password": "tajneheslo",
        "jmeno": "Novy Uzivatel",
        "telefon": "+420 123 456 789",
    }
    payload[field] = value

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 400
    assert field in _error_text(response)


def test_register_requires_json(client):
    response = client.post("/api/auth/register", data="email=test")

    assert response.status_code == 400
    assert _error_text(response) == "Request musí obsahovat JSON"


def test_register_rejects_invalid_json(client):
    response = client.post(
        "/api/auth/register",
        data="{invalid",
        content_type="application/json",
    )

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný JSON"


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "spatny-email",
            "password": "tajneheslo",
            "jmeno": "Uzivatel",
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný formát emailu"


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "novy@example.com",
            "password": "123",
            "jmeno": "Uzivatel",
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Heslo musí mít alespoň 6 znaků"


def test_register_rejects_invalid_phone(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "novy@example.com",
            "password": "tajneheslo",
            "jmeno": "Uzivatel",
            "telefon": "123",
        },
    )

    assert response.status_code == 400
    assert "Telefon" in _error_text(response)


def test_register_rejects_too_long_name(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "novy@example.com",
            "password": "tajneheslo",
            "jmeno": "A" * 51,
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Pole jmeno může mít maximálně 50 znaků"


def test_register_rejects_too_long_bio(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "novy@example.com",
            "password": "tajneheslo",
            "jmeno": "Uzivatel",
            "telefon": "+420 123 456 789",
            "bio": "A" * 501,
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Pole bio může mít maximálně 500 znaků"


def test_register_rejects_duplicate_email(client, create_verified_user):
    create_verified_user(email="obsazeno@example.com", jmeno="Prvni")

    response = client.post(
        "/api/auth/register",
        json={
            "email": "obsazeno@example.com",
            "password": "tajneheslo",
            "jmeno": "Druhy",
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Uživatel s tímto emailem již existuje"


def test_register_rejects_duplicate_username(client, create_verified_user):
    create_verified_user(email="prvni@example.com", jmeno="StejneJmeno")

    response = client.post(
        "/api/auth/register",
        json={
            "email": "druhy@example.com",
            "password": "tajneheslo",
            "jmeno": "StejneJmeno",
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 400
    assert _error_text(response) == "Toto uživatelské jméno je již obsazené."


def test_login_success(client, create_verified_user):
    create_verified_user(email="login@example.com", password="spravneheslo", jmeno="Login Test")

    response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "spravneheslo"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["uzivatel"]["email"] == "login@example.com"


def test_login_wrong_password(client, create_verified_user):
    create_verified_user(email="login@example.com", password="spravneheslo", jmeno="Login Test")

    response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "spatneheslo"},
    )

    assert response.status_code == 401
    assert _error_text(response) == "Špatné přihlašovací údaje"


def test_login_nonexistent_account(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "neexistuje@example.com", "password": "tajneheslo"},
    )

    assert response.status_code == 401
    assert _error_text(response) == "Špatné přihlašovací údaje"


@pytest.mark.parametrize("payload", [{"email": "a@example.com"}, {"password": "tajneheslo"}, {}])
def test_login_missing_fields(client, payload):
    response = client.post("/api/auth/login", json=payload)

    assert response.status_code == 400
    assert "Pole" in _error_text(response)


def test_login_rejects_unverified_user(client, create_unverified_user):
    create_unverified_user(email="nover@example.com", password="tajneheslo", jmeno="Neovereny")

    response = client.post(
        "/api/auth/login",
        json={"email": "nover@example.com", "password": "tajneheslo"},
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["error"] == "Email není ověřen"
    assert data["requires_email_verification"] is True


def test_resend_verification_for_existing_unverified_user(client, create_unverified_user, mock_emails):
    create_unverified_user(email="nover@example.com", jmeno="Neovereny")

    response = client.post("/api/auth/resend-verification", json={"email": "nover@example.com"})

    assert response.status_code == 200
    assert response.get_json()["message"] == "Pokud účet existuje, ověřovací email byl odeslán"
    assert len(mock_emails) == 1
    assert mock_emails[0]["type"] == "verification"


def test_resend_verification_for_verified_user(client, create_verified_user, mock_emails):
    create_verified_user(email="overeny@example.com", jmeno="Overeny")

    response = client.post("/api/auth/resend-verification", json={"email": "overeny@example.com"})

    assert response.status_code == 200
    assert response.get_json()["message"] == "Email už je ověřen"
    assert mock_emails == []


def test_resend_verification_for_nonexistent_user(client, mock_emails):
    response = client.post("/api/auth/resend-verification", json={"email": "nikdo@example.com"})

    assert response.status_code == 200
    assert response.get_json()["message"] == "Pokud účet existuje, ověřovací email byl odeslán"
    assert mock_emails == []


def test_verify_email_with_valid_token(client, create_unverified_user):
    uzivatel = create_unverified_user(email="verify@example.com", jmeno="Verify User")
    uzivatel.email_verification_token = "valid-token"
    uzivatel.email_verification_expires_at = utc_now() + timedelta(hours=1)
    db.session.commit()

    response = client.get("/api/auth/verify-email/valid-token")

    assert response.status_code == 200
    assert response.get_json()["message"] == "Email úspěšně ověřen"
    db.session.refresh(uzivatel)
    assert uzivatel.email_verified is True
    assert uzivatel.email_verification_token is None


def test_verify_email_with_invalid_token(client):
    response = client.get("/api/auth/verify-email/neplatny")

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný nebo použitý token"


def test_verify_email_with_expired_token(client, create_unverified_user):
    uzivatel = create_unverified_user(email="verify@example.com", jmeno="Verify User")
    uzivatel.email_verification_token = "expired-token"
    uzivatel.email_verification_expires_at = utc_now() - timedelta(minutes=1)
    db.session.commit()

    response = client.get("/api/auth/verify-email/expired-token")

    assert response.status_code == 400
    assert _error_text(response) == "Token vypršel"


def test_verify_email_already_verified_token(client, create_verified_user):
    uzivatel = create_verified_user(email="overen@example.com", jmeno="Overen")
    uzivatel.email_verification_token = "already-token"
    uzivatel.email_verification_expires_at = utc_now() + timedelta(hours=1)
    db.session.commit()

    response = client.get("/api/auth/verify-email/already-token")

    assert response.status_code == 200
    assert response.get_json()["message"] == "Email už je ověřen"


def test_forgot_password_for_existing_user(client, create_verified_user, mock_emails):
    uzivatel = create_verified_user(email="forgot@example.com", jmeno="Forgot")

    response = client.post("/api/auth/forgot-password", json={"email": "forgot@example.com"})

    assert response.status_code == 200
    assert "Pokud účet existuje" in response.get_json()["message"]
    db.session.refresh(uzivatel)
    assert uzivatel.password_reset_token is not None
    assert len(mock_emails) == 1
    assert mock_emails[0]["type"] == "password_reset"


def test_forgot_password_for_nonexistent_user(client, mock_emails):
    response = client.post("/api/auth/forgot-password", json={"email": "missing@example.com"})

    assert response.status_code == 200
    assert "Pokud účet existuje" in response.get_json()["message"]
    assert mock_emails == []


def test_forgot_password_rejects_invalid_email(client):
    response = client.post("/api/auth/forgot-password", json={"email": "neplatny"})

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný formát emailu"


def test_verify_reset_password_token_valid(client, create_verified_user):
    uzivatel = create_verified_user(email="reset@example.com", jmeno="Reset")
    uzivatel.password_reset_token = "reset-token"
    uzivatel.password_reset_expires_at = utc_now() + timedelta(hours=1)
    db.session.commit()

    response = client.get("/api/auth/reset-password/reset-token")

    assert response.status_code == 200
    assert response.get_json()["message"] == "Token je platný"


def test_verify_reset_password_token_invalid(client):
    response = client.get("/api/auth/reset-password/spatny-token")

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný nebo již použitý token"


def test_verify_reset_password_token_expired(client, create_verified_user):
    uzivatel = create_verified_user(email="reset@example.com", jmeno="Reset")
    uzivatel.password_reset_token = "expired-reset"
    uzivatel.password_reset_expires_at = utc_now() - timedelta(minutes=5)
    db.session.commit()

    response = client.get("/api/auth/reset-password/expired-reset")

    assert response.status_code == 400
    assert _error_text(response) == "Token vypršel"


def test_reset_password_success(client, create_verified_user):
    uzivatel = create_verified_user(email="reset@example.com", password="stareheslo", jmeno="Reset")
    uzivatel.password_reset_token = "reset-token"
    uzivatel.password_reset_expires_at = utc_now() + timedelta(hours=1)
    db.session.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": "reset-token", "new_password": "noveheslo123"},
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Heslo bylo úspěšně obnoveno"
    db.session.refresh(uzivatel)
    assert uzivatel.password_reset_token is None
    assert uzivatel.check_heslo("noveheslo123") is True


def test_reset_password_invalid_token(client):
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "spatny", "new_password": "noveheslo123"},
    )

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný nebo již použitý token"


def test_reset_password_expired_token(client, create_verified_user):
    uzivatel = create_verified_user(email="reset@example.com", jmeno="Reset")
    uzivatel.password_reset_token = "expired-token"
    uzivatel.password_reset_expires_at = utc_now() - timedelta(minutes=5)
    db.session.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": "expired-token", "new_password": "noveheslo123"},
    )

    assert response.status_code == 400
    assert _error_text(response) == "Token vypršel"


def test_reset_password_rejects_short_password(client, create_verified_user):
    uzivatel = create_verified_user(email="reset@example.com", jmeno="Reset")
    uzivatel.password_reset_token = "short-token"
    uzivatel.password_reset_expires_at = utc_now() + timedelta(hours=1)
    db.session.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": "short-token", "new_password": "123"},
    )

    assert response.status_code == 400
    assert _error_text(response) == "Nové heslo musí mít alespoň 6 znaků"


def test_get_current_user(client, create_verified_user, auth_headers):
    create_verified_user(email="me@example.com", jmeno="Ja")

    response = client.get("/api/auth/me", headers=auth_headers("me@example.com"))

    assert response.status_code == 200
    assert response.get_json()["uzivatel"]["email"] == "me@example.com"


def test_change_password_success(client, create_verified_user, auth_headers):
    create_verified_user(email="heslo@example.com", password="stareheslo", jmeno="Heslo")

    response = client.post(
        "/api/auth/change-password",
        json={"stare_heslo": "stareheslo", "nove_heslo": "noveheslo123"},
        headers=auth_headers("heslo@example.com", "stareheslo"),
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Heslo úspěšně změněno"

    login_response = client.post(
        "/api/auth/login",
        json={"email": "heslo@example.com", "password": "noveheslo123"},
    )
    assert login_response.status_code == 200


def test_change_password_wrong_old_password(client, create_verified_user, auth_headers):
    create_verified_user(email="heslo@example.com", password="stareheslo", jmeno="Heslo")

    response = client.post(
        "/api/auth/change-password",
        json={"stare_heslo": "spatne", "nove_heslo": "noveheslo123"},
        headers=auth_headers("heslo@example.com", "stareheslo"),
    )

    assert response.status_code == 401
    assert _error_text(response) == "Neplatné staré heslo"


def test_change_password_requires_json(client, create_verified_user, auth_headers):
    create_verified_user(email="heslo@example.com", password="stareheslo", jmeno="Heslo")

    response = client.post(
        "/api/auth/change-password",
        data="not-json",
        headers=auth_headers("heslo@example.com", "stareheslo"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Request musí obsahovat JSON"


def test_register_creates_profile_record(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "profil@example.com",
            "password": "tajneheslo",
            "jmeno": "Profilovy Uzivatel",
            "telefon": "+420 123 456 789",
        },
    )

    assert response.status_code == 201
    uzivatel = Uzivatel.query.filter_by(email="profil@example.com").first()
    profil = Profil.query.filter_by(uzivatel_id=uzivatel.id).first()
    assert profil is not None
    assert profil.jmeno == "Profilovy Uzivatel"
