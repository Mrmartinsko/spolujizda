from datetime import timedelta

import pytest

from models import db
from models.jizda import Jizda
from models.rezervace import Rezervace
from utils.datetime_utils import utc_now


def _error_text(response):
    data = response.get_json()
    return data.get("error") or data.get("msg")


def test_create_booking_success(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.post(
        "/api/rezervace/",
        json={
            "jizda_id": jizda.id,
            "pocet_mist": 1,
            "dalsi_pasazeri": [],
            "poznamka": "Prijdu vcas",
        },
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 201
    data = response.get_json()["rezervace"]
    assert data["status"] == "cekajici"
    assert data["jizda_id"] == jizda.id
    assert Rezervace.query.count() == 1


def test_create_booking_requires_token(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.post("/api/rezervace/", json={"jizda_id": jizda.id, "pocet_mist": 1})

    assert response.status_code == 401


def test_create_booking_requires_json(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.post(
        "/api/rezervace/",
        data="not-json",
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Request musí obsahovat JSON"


def test_create_booking_requires_ride_id(
    client, create_verified_user, auth_headers
):
    create_verified_user(email="pasazer@example.com", jmeno="Pasazer")

    response = client.post(
        "/api/rezervace/",
        json={"pocet_mist": 1},
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "ID jízdy je povinné"


@pytest.mark.parametrize(
    ("payload", "expected_error"),
    [
        ({"jizda_id": "abc", "pocet_mist": 1}, "Pole jizda_id musí být celé číslo"),
        ({"jizda_id": 1, "pocet_mist": "abc"}, "Pole pocet_mist musí být celé číslo"),
        ({"jizda_id": 1, "pocet_mist": 0}, "Pole pocet_mist musí být větší než 0"),
        ({"jizda_id": 1, "pocet_mist": 2, "dalsi_pasazeri": "x"}, "Další pasažéři musí být seznam jmen"),
        (
            {"jizda_id": 1, "pocet_mist": 2, "dalsi_pasazeri": []},
            "Počet jmen dalších pasažérů musí odpovídat počtu rezervovaných míst",
        ),
        (
            {"jizda_id": 1, "pocet_mist": 2, "dalsi_pasazeri": [123]},
            "Každé jméno dalšího pasažéra musí být text",
        ),
        (
            {"jizda_id": 1, "pocet_mist": 2, "dalsi_pasazeri": [" "]},
            "Jména dalších pasažérů nesmí být prázdná",
        ),
        ({"jizda_id": 1, "pocet_mist": 1, "poznamka": 123}, "Pole poznamka musí být text"),
    ],
)
def test_create_booking_rejects_invalid_payload(
    client, create_verified_user, auth_headers, payload, expected_error
):
    create_verified_user(email="pasazer@example.com", jmeno="Pasazer")

    response = client.post(
        "/api/rezervace/",
        json=payload,
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_create_booking_rejects_own_ride(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert "vlast" in _error_text(response).lower()


def test_create_booking_rejects_duplicate_booking(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    reservation_factory(pasazer, jizda)

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Již máte aktivní rezervaci na tuto jízdu"


@pytest.mark.parametrize("status", ["zrusena", "dokoncena"])
def test_create_booking_rejects_inactive_ride(
    client, create_verified_user, create_auto, create_ride, auth_headers, status
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, status=status)

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Rezervaci lze vytvořit jen pro aktivní jízdu"


def test_create_booking_on_past_active_ride_matches_current_behavior(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(
        ridic,
        auto,
        departure=utc_now() - timedelta(hours=2),
        arrival=utc_now() - timedelta(hours=1),
        status="aktivni",
    )

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 201
    assert response.get_json()["rezervace"]["jizda_id"] == jizda.id


def test_create_booking_rejects_full_ride(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    prvni = create_verified_user(email="prvni@example.com", jmeno="Prvni")
    dalsi = create_verified_user(email="dalsi@example.com", jmeno="Dalsi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=1)
    create_accepted_reservation(prvni, jizda, pocet_mist=1)

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("dalsi@example.com"),
    )

    assert response.status_code == 400
    assert "obsazen" in _error_text(response).lower()


def test_get_my_bookings_returns_sent_and_received(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    reservation_factory(pasazer, jizda)

    ridic_response = client.get("/api/rezervace/moje", headers=auth_headers("ridic@example.com"))
    pasazer_response = client.get(
        "/api/rezervace/moje", headers=auth_headers("pasazer@example.com")
    )

    assert ridic_response.status_code == 200
    assert any(item["typ"] == "prijata" for item in ridic_response.get_json())
    assert pasazer_response.status_code == 200
    assert any(item["typ"] == "odeslana" for item in pasazer_response.get_json())


def test_get_ride_bookings_by_driver(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.get(
        f"/api/rezervace/jizda/{jizda.id}",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 200
    assert response.get_json()["rezervace"][0]["id"] == rezervace.id


def test_get_ride_bookings_rejects_foreign_user(
    client, create_verified_user, create_auto, create_ride, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.get(
        f"/api/rezervace/jizda/{jizda.id}",
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemáte oprávnění zobrazit rezervace této jízdy"


def test_accept_booking_success(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.post(
        f"/api/rezervace/{rezervace.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(rezervace)
    assert rezervace.status == "prijata"
    assert pasazer in jizda.pasazeri


def test_accept_booking_rejects_foreign_user(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.post(
        f"/api/rezervace/{rezervace.id}/prijmout",
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemáte oprávnění přijmout tuto rezervaci"


def test_accept_booking_rejects_processed_booking(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda, status="odmitnuta")

    response = client.post(
        f"/api/rezervace/{rezervace.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Rezervace již byla zpracována"


def test_accept_booking_rejects_inactive_ride(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, status="zrusena")
    rezervace = reservation_factory(pasazer, jizda)

    response = client.post(
        f"/api/rezervace/{rezervace.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Rezervaci lze přijmout jen u aktivní jízdy"


def test_accept_booking_rejects_when_capacity_is_full(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    reservation_factory,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    prvni = create_verified_user(email="prvni@example.com", jmeno="Prvni")
    druhy = create_verified_user(email="druhy@example.com", jmeno="Druhy")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=1)
    create_accepted_reservation(prvni, jizda)
    cekajici = reservation_factory(druhy, jizda)

    response = client.post(
        f"/api/rezervace/{cekajici.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert "obsazen" in _error_text(response).lower()


def test_reject_booking_success(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.post(
        f"/api/rezervace/{rezervace.id}/odmitnout",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(rezervace)
    assert rezervace.status == "odmitnuta"


def test_reject_booking_rejects_foreign_user(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.post(
        f"/api/rezervace/{rezervace.id}/odmitnout",
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemáte oprávnění odmítnout tuto rezervaci"


def test_cancel_booking_success_before_deadline(
    client, create_verified_user, create_auto, create_ride, create_accepted_reservation, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, departure=utc_now() + timedelta(days=1))
    rezervace = create_accepted_reservation(pasazer, jizda)

    response = client.delete(
        f"/api/rezervace/{rezervace.id}/zrusit",
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(rezervace)
    assert rezervace.status == "zrusena"
    assert pasazer not in jizda.pasazeri


def test_cancel_booking_rejects_foreign_user(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    rezervace = reservation_factory(pasazer, jizda)

    response = client.delete(
        f"/api/rezervace/{rezervace.id}/zrusit",
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemáš oprávnění rušit tuto rezervaci."


def test_cancel_booking_rejects_inactive_ride(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, status="zrusena")
    rezervace = reservation_factory(pasazer, jizda, status="prijata")

    response = client.delete(
        f"/api/rezervace/{rezervace.id}/zrusit",
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Jízda není aktivní, nelze ji opustit."


def test_cancel_booking_rejects_too_late(
    client, create_verified_user, create_auto, create_ride, reservation_factory, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(
        ridic,
        auto,
        departure=utc_now() + timedelta(minutes=30),
        arrival=utc_now() + timedelta(hours=2),
    )
    rezervace = reservation_factory(pasazer, jizda, status="prijata")

    response = client.delete(
        f"/api/rezervace/{rezervace.id}/zrusit",
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert "1 hodinu před odjezdem" in _error_text(response)


def test_accepted_passengers_follow_ride_capacity(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    reservation_factory,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    prvni = create_verified_user(email="prvni@example.com", jmeno="Prvni")
    druhy = create_verified_user(email="druhy@example.com", jmeno="Druhy")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=2)
    prvni_rezervace = reservation_factory(prvni, jizda, pocet_mist=2)
    druha_rezervace = reservation_factory(druhy, jizda, pocet_mist=1)

    prvni_response = client.post(
        f"/api/rezervace/{prvni_rezervace.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )
    druha_response = client.post(
        f"/api/rezervace/{druha_rezervace.id}/prijmout",
        headers=auth_headers("ridic@example.com"),
    )

    assert prvni_response.status_code == 200
    assert druha_response.status_code == 400
    db.session.refresh(jizda)
    assert jizda.get_volna_mista() == 0
