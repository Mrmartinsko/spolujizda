import pytest

from models import db
from models.auto import Auto
from models.profil import Profil


def _error_text(response):
    data = response.get_json()
    return data.get("error") or data.get("msg")


def test_get_own_profile_success(client, create_verified_user, auth_headers):
    create_verified_user(email="profil@example.com", jmeno="Profil")

    response = client.get("/api/uzivatele/profil", headers=auth_headers("profil@example.com"))

    assert response.status_code == 200
    assert response.get_json()["uzivatel"]["profil"]["jmeno"] == "Profil"


def test_get_own_profile_requires_token(client):
    response = client.get("/api/uzivatele/profil")

    assert response.status_code == 401


def test_update_profile_success(client, create_verified_user, auth_headers):
    create_verified_user(email="profil@example.com", jmeno="Profil")

    response = client.put(
        "/api/uzivatele/profil",
        json={"jmeno": "Nove Jmeno", "bio": "Nova bio", "fotka": "avatar.png"},
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 200
    data = response.get_json()["uzivatel"]["profil"]
    assert data["jmeno"] == "Nove Jmeno"
    assert data["bio"] == "Nova bio"
    assert data["fotka"] == "avatar.png"


@pytest.mark.parametrize(
    ("payload", "expected_error"),
    [
        ({"jmeno": " "}, "Pole jmeno je povinne"),
        ({"jmeno": "A" * 51}, "Pole jmeno muze mit maximalne 50 znaku"),
        ({"bio": "A" * 501}, "Pole bio muze mit maximalne 500 znaku"),
        ({"fotka": 123}, "Pole fotka musi byt text"),
    ],
)
def test_update_profile_rejects_invalid_values(
    client, create_verified_user, auth_headers, payload, expected_error
):
    create_verified_user(email="profil@example.com", jmeno="Profil")

    response = client.put(
        "/api/uzivatele/profil",
        json=payload,
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_update_profile_rejects_duplicate_username(client, create_verified_user, auth_headers):
    create_verified_user(email="prvni@example.com", jmeno="Prvni")
    create_verified_user(email="druhy@example.com", jmeno="Druhy")

    response = client.put(
        "/api/uzivatele/profil",
        json={"jmeno": "Prvni"},
        headers=auth_headers("druhy@example.com"),
    )

    assert response.status_code == 409
    assert _error_text(response) == "Toto uzivatelske jmeno je jiz obsazene."


def test_get_other_profile_hides_email(client, create_verified_user, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")

    response = client.get(
        f"/api/uzivatele/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 200
    assert response.get_json()["uzivatel"]["profil"]["jmeno"] == "On"
    assert response.get_json()["uzivatel"]["profil"]["email"] is None
    assert current.id != other.id


def test_get_other_profile_rejects_when_blocked_by_current(
    client, create_verified_user, block_factory, auth_headers
):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=current, blocked=other)

    response = client.get(
        f"/api/uzivatele/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Uzivatel je blokovan"


def test_get_other_profile_rejects_when_blocked_me(
    client, create_verified_user, block_factory, auth_headers
):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=other, blocked=current)

    response = client.get(
        f"/api/uzivatele/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemate pristup k tomuto profilu"


def test_search_users_partial_match(client, create_verified_user, auth_headers):
    create_verified_user(email="adam@example.com", jmeno="Adam Novak")
    create_verified_user(email="eva@example.com", jmeno="Eva Nova")

    response = client.get(
        "/api/uzivatele/hledat?q=Nov",
        headers=auth_headers("adam@example.com"),
    )

    assert response.status_code == 200
    assert response.get_json()["celkem"] >= 1
    assert any("Nov" in item["jmeno"] for item in response.get_json()["uzivatele"])


@pytest.mark.parametrize(
    ("query", "expected_error"),
    [("A", "Vyhledavaci dotaz musi mit alespon 2 znaky"), ("A" * 51, "Vyhledavaci dotaz muze mit maximalne 50 znaku")],
)
def test_search_users_rejects_invalid_query(
    client, create_verified_user, auth_headers, query, expected_error
):
    create_verified_user(email="adam@example.com", jmeno="Adam Novak")

    response = client.get(
        f"/api/uzivatele/hledat?q={query}",
        headers=auth_headers("adam@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_create_car_success(client, create_verified_user, auth_headers):
    create_verified_user(email="profil@example.com", jmeno="Profil")

    response = client.post(
        "/api/auta/moje-nove",
        json={"znacka": "Skoda", "model": "Octavia", "barva": "modra", "spz": "1AB2345"},
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 201
    auto = response.get_json()["auto"]
    assert auto["znacka"] == "Skoda"
    assert auto["primarni"] is True


@pytest.mark.parametrize(
    ("payload", "expected_error"),
    [
        ({"model": "Octavia"}, "Pole znacka je povinne"),
        ({"znacka": "Skoda"}, "Pole model je povinne"),
        ({"znacka": "Skoda", "model": "Octavia", "spz": "???"}, "Neplatny format SPZ"),
        (
            {"znacka": "Skoda", "model": "Octavia", "primarni": "ano"},
            "Pole primarni musi byt true nebo false",
        ),
        (
            {"znacka": "Skoda", "model": "Octavia", "docasne": "ano"},
            "Pole docasne musi byt true nebo false",
        ),
    ],
)
def test_create_car_rejects_invalid_payload(
    client, create_verified_user, auth_headers, payload, expected_error
):
    create_verified_user(email="profil@example.com", jmeno="Profil")

    response = client.post(
        "/api/auta/moje-nove",
        json=payload,
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_create_duplicate_spz_matches_current_behavior(client, create_verified_user, auth_headers):
    create_verified_user(email="profil@example.com", jmeno="Profil")
    payload = {"znacka": "Skoda", "model": "Octavia", "spz": "1AB2345"}

    first = client.post("/api/auta/moje-nove", json=payload, headers=auth_headers("profil@example.com"))
    second = client.post("/api/auta/moje-nove", json=payload, headers=auth_headers("profil@example.com"))

    assert first.status_code == 201
    assert second.status_code == 201
    assert Auto.query.count() == 2


def test_list_my_cars(client, create_verified_user, create_auto, auth_headers):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    create_auto(user, spz="1AB2345")
    create_auto(user, spz="2AB2345", primarni=False)

    response = client.get("/api/auta/moje", headers=auth_headers("profil@example.com"))

    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_update_car_success(client, create_verified_user, create_auto, auth_headers):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    auto = create_auto(user)

    response = client.put(
        f"/api/auta/{auto.id}",
        json={"znacka": "VW", "model": "Golf", "barva": "cervena"},
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 200
    data = response.get_json()["auto"]
    assert data["znacka"] == "VW"
    assert data["model"] == "Golf"


def test_update_foreign_car_not_found(client, create_verified_user, create_auto, auth_headers):
    owner = create_verified_user(email="owner@example.com", jmeno="Owner")
    other = create_verified_user(email="other@example.com", jmeno="Other")
    auto = create_auto(owner)

    response = client.put(
        f"/api/auta/{auto.id}",
        json={"znacka": "VW"},
        headers=auth_headers("other@example.com"),
    )

    assert response.status_code == 404
    assert _error_text(response) == "Auto nenalezeno"


def test_delete_car_without_active_rides(client, create_verified_user, create_auto, auth_headers):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    auto = create_auto(user)

    response = client.delete(f"/api/auta/{auto.id}", headers=auth_headers("profil@example.com"))

    assert response.status_code == 200
    db.session.refresh(auto)
    assert auto.smazane is True


def test_delete_car_with_active_rides_rejected(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    auto = create_auto(user)
    create_ride(user, auto)

    response = client.delete(f"/api/auta/{auto.id}", headers=auth_headers("profil@example.com"))

    assert response.status_code == 409
    assert "aktivni jizdy" in _error_text(response)


def test_set_primary_car_success(client, create_verified_user, create_auto, auth_headers):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    first = create_auto(user, spz="1AB2345", primarni=True)
    second = create_auto(user, spz="2AB2345", primarni=False)

    response = client.post(
        f"/api/auta/{second.id}/nastavit-primarni",
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(first)
    db.session.refresh(second)
    assert first.primarni is False
    assert second.primarni is True


def test_deleting_primary_car_assigns_new_primary(client, create_verified_user, create_auto, auth_headers):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    first = create_auto(user, spz="1AB2345", primarni=True)
    second = create_auto(user, spz="2AB2345", primarni=False)

    response = client.delete(f"/api/auta/{first.id}", headers=auth_headers("profil@example.com"))

    assert response.status_code == 200
    db.session.refresh(first)
    db.session.refresh(second)
    assert first.smazane is True
    assert second.primarni is True


def test_replace_car_for_active_rides_success(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    stare = create_auto(user, spz="1AB2345")
    nove = create_auto(user, spz="2AB2345", primarni=False)
    jizda = create_ride(user, stare)

    response = client.post(
        f"/api/auta/replace/{stare.id}",
        json={"nove_auto_id": nove.id},
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(jizda)
    db.session.refresh(stare)
    assert jizda.auto_id == nove.id
    assert stare.smazane is True


def test_replace_car_requires_new_car_id(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    stare = create_auto(user, spz="1AB2345")
    create_ride(user, stare)

    response = client.post(
        f"/api/auta/replace/{stare.id}",
        json={},
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Pole nove_auto_id musi byt cele cislo"


def test_cancel_active_rides_for_car_success(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    user = create_verified_user(email="profil@example.com", jmeno="Profil")
    auto = create_auto(user)
    jizda = create_ride(user, auto)

    response = client.post(
        f"/api/auta/{auto.id}/zrusit-aktivni-jizdy",
        headers=auth_headers("profil@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(auto)
    db.session.refresh(jizda)
    assert auto.smazane is True
    assert jizda.status == "zrusena"
