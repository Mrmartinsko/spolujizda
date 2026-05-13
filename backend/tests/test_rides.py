from datetime import timedelta

import pytest

from models import db
from models.auto import Auto
from models.jizda import Jizda
from models.oznameni import Oznameni
from models.rezervace import Rezervace
from utils.datetime_utils import utc_now


def _error_text(response):
    data = response.get_json()
    return data.get("error") or data.get("msg")


def test_create_ride_success(client, create_verified_user, create_auto, auth_headers, ride_payload):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id),
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["jizda"]["odkud"] == "Brno"
    assert data["jizda"]["kam"] == "Praha"
    assert Jizda.query.count() == 1


def test_create_ride_requires_token(client, create_verified_user, create_auto, ride_payload):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)

    response = client.post("/api/jizdy/", json=ride_payload(auto.id))

    assert response.status_code == 401


def test_create_ride_requires_json(client, create_verified_user, create_auto, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    create_auto(ridic)

    response = client.post(
        "/api/jizdy/",
        data="not-json",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Request musí obsahovat JSON"


@pytest.mark.parametrize(
    "missing_field",
    ["auto_id", "odkud", "kam", "cas_odjezdu", "cas_prijezdu", "cena", "pocet_mist"],
)
def test_create_ride_rejects_missing_required_fields(
    client, create_verified_user, create_auto, auth_headers, ride_payload, missing_field
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id)
    payload.pop(missing_field)

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert missing_field in _error_text(response)


@pytest.mark.parametrize(
    ("field", "value"),
    [("odkud", " "), ("kam", " "), ("odkud", "A" * 101), ("kam", "A" * 101)],
)
def test_create_ride_rejects_invalid_text_locations(
    client, create_verified_user, create_auto, auth_headers, ride_payload, field, value
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={field: value})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert field in _error_text(response)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("cas_odjezdu", "spatne-datum"),
        ("cas_prijezdu", "spatne-datum"),
    ],
)
def test_create_ride_rejects_invalid_datetime_format(
    client, create_verified_user, create_auto, auth_headers, ride_payload, field, value
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={field: value})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert field in _error_text(response)


def test_create_ride_rejects_departure_in_past(
    client, create_verified_user, create_auto, auth_headers, ride_payload
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    departure = utc_now() - timedelta(hours=1)
    arrival = departure + timedelta(hours=2)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id, departure=departure, arrival=arrival),
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Čas odjezdu musí být v budoucnosti"


def test_create_ride_rejects_arrival_before_departure(
    client, create_verified_user, create_auto, auth_headers, ride_payload
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    departure = utc_now() + timedelta(days=1)
    arrival = departure - timedelta(minutes=10)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id, departure=departure, arrival=arrival),
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Čas odjezdu musí být před časem příjezdu"


@pytest.mark.parametrize(
    ("field", "value", "expected_error"),
    [
        ("cena", "abc", "Pole cena musí být číslo"),
        ("cena", -1, "Pole cena musí být větší nebo rovno 0"),
        ("pocet_mist", "abc", "Pole pocet_mist musí být celé číslo"),
        ("pocet_mist", 0, "Pole pocet_mist musí být větší než 0"),
    ],
)
def test_create_ride_rejects_invalid_price_and_seats(
    client,
    create_verified_user,
    create_auto,
    auth_headers,
    ride_payload,
    field,
    value,
    expected_error,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={field: value})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_create_ride_rejects_non_owned_car(
    client, create_verified_user, create_auto, auth_headers, ride_payload
):
    vlastnik = create_verified_user(email="vlastnik@example.com", jmeno="Vlastnik")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(vlastnik)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id),
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 404
    assert _error_text(response) == "Auto nenalezeno nebo nepatří uživateli"


def test_create_ride_rejects_deleted_car(
    client, create_verified_user, create_auto, auth_headers, ride_payload
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic, smazane=True)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id),
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 404
    assert _error_text(response) == "Auto nenalezeno nebo nepatří uživateli"


def test_create_ride_with_string_stopovers(client, create_verified_user, create_auto, auth_headers, ride_payload):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={"mezistanice": ["Jihlava", "Humpolec"]})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 201
    assert len(response.get_json()["jizda"]["mezistanice"]) == 2


def test_create_ride_with_object_stopovers(client, create_verified_user, create_auto, auth_headers, ride_payload):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(
        auto.id,
        overrides={
            "mezistanice": [
                {"text": "Jihlava", "place_id": None},
                {"misto": "Humpolec", "misto_place_id": None},
            ]
        },
    )

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 201
    data = response.get_json()["jizda"]
    assert [item["misto"] for item in data["mezistanice"]] == ["Jihlava", "Humpolec"]


@pytest.mark.parametrize(
    ("mezistanice", "expected_error"),
    [
        ("Jihlava", "mezistanice musí být seznam"),
        ([123], "mezistanice musí být seznam textů nebo objektů"),
        ([" "], "Pole mezistanice je povinné"),
    ],
)
def test_create_ride_rejects_invalid_stopovers(
    client,
    create_verified_user,
    create_auto,
    auth_headers,
    ride_payload,
    mezistanice,
    expected_error,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={"mezistanice": mezistanice})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == expected_error


def test_create_ride_rejects_invalid_place_id(
    client, create_verified_user, create_auto, auth_headers, ride_payload
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    payload = ride_payload(auto.id, overrides={"odkud_place_id": "neexistuje"})

    response = client.post(
        "/api/jizdy/",
        json=payload,
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Pole odkud obsahuje neplatnou lokalitu"


def test_create_ride_rejects_overlapping_driver_rides(
    client, create_verified_user, create_auto, create_ride, auth_headers, ride_payload
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    departure = utc_now() + timedelta(days=1)
    create_ride(ridic, auto, departure=departure, arrival=departure + timedelta(hours=2))

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(
            auto.id,
            departure=departure + timedelta(minutes=30),
            arrival=departure + timedelta(hours=3),
        ),
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 409
    assert "nesmí krýt" in _error_text(response)


def test_get_ride_not_found(client):
    response = client.get("/api/jizdy/999")

    assert response.status_code == 404
    assert _error_text(response) == "Jízda nenalezena"


def test_update_ride_success(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    departure = utc_now() + timedelta(days=2)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={
            "odkud": "Olomouc",
            "kam": "Ostrava",
            "cas_odjezdu": departure.isoformat(),
            "cas_prijezdu": (departure + timedelta(hours=1)).isoformat(),
            "pocet_mist": 4,
            "mezistanice": ["Hranice"],
        },
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 200
    data = response.get_json()["jizda"]
    assert data["odkud"] == "Olomouc"
    assert data["kam"] == "Ostrava"
    assert data["pocet_mist"] == 4
    assert data["mezistanice"][0]["misto"] == "Hranice"


def test_update_foreign_ride_forbidden(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"odkud": "Olomouc"},
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemáte oprávnění upravovat tuto jízdu"


@pytest.mark.parametrize("status", ["zrusena", "dokoncena"])
def test_update_non_active_ride_rejected(
    client, create_verified_user, create_auto, create_ride, auth_headers, status
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, status=status)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"odkud": "Olomouc"},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Lze upravovat pouze aktivní jízdy"


def test_update_past_ride_rejected(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    departure = utc_now() - timedelta(hours=2)
    arrival = utc_now() - timedelta(hours=1)
    jizda = create_ride(ridic, auto, departure=departure, arrival=arrival, status="aktivni")

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"odkud": "Olomouc"},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Jízdu už nelze upravit, protože už odjela"


def test_update_ride_rejects_price_change(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"cena": 200},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Cenu existující jízdy nelze měnit"


def test_update_ride_rejects_capacity_below_accepted_reservations(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=3)
    create_accepted_reservation(pasazer, jizda, pocet_mist=2)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"pocet_mist": 1},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert "již přijatých pasažérů" in _error_text(response)


def test_update_ride_rejects_invalid_auto(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    other = create_verified_user(email="other@example.com", jmeno="Other")
    auto = create_auto(ridic)
    cizi_auto = create_auto(other, spz="8AB1234")
    jizda = create_ride(ridic, auto)

    response = client.put(
        f"/api/jizdy/{jizda.id}",
        json={"auto_id": cizi_auto.id},
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 404
    assert _error_text(response) == "Auto nenalezeno nebo nepatří uživateli"


def test_delete_ride_success(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.delete(f"/api/jizdy/{jizda.id}", headers=auth_headers("ridic@example.com"))

    assert response.status_code == 200
    db.session.refresh(jizda)
    assert jizda.status == "zrusena"


def test_delete_ride_notifies_passengers_without_driver_notification(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, odkud="Vsetín", kam="Praha")
    create_accepted_reservation(pasazer, jizda)

    response = client.delete(f"/api/jizdy/{jizda.id}", headers=auth_headers("ridic@example.com"))

    assert response.status_code == 200
    notifications = Oznameni.query.all()
    assert len(notifications) == 1
    assert notifications[0].prijemce_id == pasazer.id
    assert notifications[0].odesilatel_id == ridic.id
    assert notifications[0].typ == "jizda_zrusena"
    assert notifications[0].kategorie == "jizdy"
    assert notifications[0].zprava == "Řidič zrušil jízdu Vsetín → Praha."
    assert not Oznameni.query.filter_by(prijemce_id=ridic.id).first()


def test_delete_ride_notifies_waiting_reservations_once(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    reservation_factory,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    accepted = create_verified_user(email="accepted@example.com", jmeno="Accepted")
    waiting = create_verified_user(email="waiting@example.com", jmeno="Waiting")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    create_accepted_reservation(accepted, jizda)
    reservation_factory(accepted, jizda, status="cekajici")
    reservation_factory(waiting, jizda, status="cekajici")

    response = client.delete(f"/api/jizdy/{jizda.id}", headers=auth_headers("ridic@example.com"))

    assert response.status_code == 200
    notifications = Oznameni.query.order_by(Oznameni.prijemce_id.asc()).all()
    assert [item.prijemce_id for item in notifications] == sorted([accepted.id, waiting.id])
    assert len({item.unikatni_klic for item in notifications}) == 2


def test_delete_foreign_ride_forbidden(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.delete(f"/api/jizdy/{jizda.id}", headers=auth_headers("cizi@example.com"))

    assert response.status_code == 403
    assert _error_text(response) == "Nemáte oprávnění zrušit tuto jízdu"


def test_my_rides_marks_finished_past_rides(client, create_verified_user, create_auto, create_ride, auth_headers):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(
        ridic,
        auto,
        departure=utc_now() - timedelta(hours=3),
        arrival=utc_now() - timedelta(hours=1),
        status="aktivni",
    )

    response = client.get("/api/jizdy/moje", headers=auth_headers("ridic@example.com"))

    assert response.status_code == 200
    assert any(item["status"] == "dokoncena" for item in response.get_json())
    db.session.refresh(jizda)
    assert jizda.status == "dokoncena"


def test_get_rides_listing_without_filters(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    create_ride(ridic, auto, odkud="Brno", kam="Praha")
    create_ride(ridic, auto, odkud="Olomouc", kam="Ostrava", departure=utc_now() + timedelta(days=2))

    response = client.get("/api/jizdy/")

    assert response.status_code == 200
    data = response.get_json()
    assert data["celkem"] == 2
    assert len(data["jizdy"]) == 2


def test_get_rides_filters_by_origin(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    create_ride(ridic, auto, odkud="Brno", kam="Praha")
    create_ride(ridic, auto, odkud="Olomouc", kam="Praha", departure=utc_now() + timedelta(days=2))

    response = client.get("/api/jizdy/?odkud=Brno")

    assert response.status_code == 200
    assert response.get_json()["celkem"] == 1
    assert response.get_json()["jizdy"][0]["odkud"] == "Brno"


def test_get_rides_filters_by_destination(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    create_ride(ridic, auto, odkud="Brno", kam="Praha")
    create_ride(ridic, auto, odkud="Brno", kam="Ostrava", departure=utc_now() + timedelta(days=2))

    response = client.get("/api/jizdy/?kam=Ostrava")

    assert response.status_code == 200
    assert response.get_json()["celkem"] == 1
    assert response.get_json()["jizdy"][0]["kam"] == "Ostrava"


def test_get_rides_filters_by_date(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    departure = utc_now() + timedelta(days=4)
    create_ride(ridic, auto, departure=departure, arrival=departure + timedelta(hours=1))
    create_ride(
        ridic,
        auto,
        departure=departure + timedelta(days=1),
        arrival=departure + timedelta(days=1, hours=1),
    )

    response = client.get(f"/api/jizdy/?datum={departure.date().isoformat()}")

    assert response.status_code == 200
    assert response.get_json()["celkem"] == 1


def test_get_rides_filters_by_passenger_count(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=2)
    create_accepted_reservation(pasazer, jizda, pocet_mist=1)

    response = client.get("/api/jizdy/?pocet_pasazeru=2")

    assert response.status_code == 200
    assert response.get_json()["celkem"] == 0


def test_search_rides_by_date_invalid_format(client):
    response = client.get("/api/jizdy/vyhledat?datum=31-03-2026")

    assert response.status_code == 400
    assert _error_text(response) == "Neplatný formát data (YYYY-MM-DD)"


def test_search_rides_returns_full_and_partial_matches(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    create_ride(
        ridic,
        auto,
        odkud="Brno",
        kam="Praha",
        mezistanice=[{"misto": "Jihlava"}, {"misto": "Humpolec"}],
    )
    create_ride(
        ridic,
        auto,
        odkud="Brno",
        kam="Plzen",
        departure=utc_now() + timedelta(days=2),
        arrival=utc_now() + timedelta(days=2, hours=1),
    )

    response = client.get("/api/jizdy/vyhledat?odkud=Jihlava&kam=Praha")

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["match_type"] == "full"

    partial_response = client.get("/api/jizdy/vyhledat?odkud=Brno&kam=Liberec")
    assert partial_response.status_code == 200
    partial_data = partial_response.get_json()
    assert partial_data
    assert all(item["match_type"] == "partial" for item in partial_data)


def test_get_newest_rides_returns_latest_first(client, create_verified_user, create_auto, create_ride):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    auto = create_auto(ridic)
    older = create_ride(ridic, auto, departure=utc_now() + timedelta(days=1))
    newer = create_ride(
        ridic,
        auto,
        departure=utc_now() + timedelta(days=2),
        arrival=utc_now() + timedelta(days=2, hours=1),
    )

    response = client.get("/api/jizdy/nejnovejsi")

    assert response.status_code == 200
    data = response.get_json()
    assert data[0]["id"] == newer.id
    assert {item["id"] for item in data} == {older.id, newer.id}


def test_remove_passenger_success(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, departure=utc_now() + timedelta(days=1))
    rezervace = create_accepted_reservation(pasazer, jizda)

    response = client.delete(
        f"/api/jizdy/{jizda.id}/pasazeri/{pasazer.id}",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(rezervace)
    assert rezervace.status == "vyhozen"
    assert pasazer not in jizda.pasazeri


def test_remove_passenger_forbidden_for_non_driver(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)
    create_accepted_reservation(pasazer, jizda)

    response = client.delete(
        f"/api/jizdy/{jizda.id}/pasazeri/{pasazer.id}",
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert "oprávnění" in _error_text(response)


def test_remove_passenger_rejected_too_close_to_departure(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
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
    create_accepted_reservation(pasazer, jizda)

    response = client.delete(
        f"/api/jizdy/{jizda.id}/pasazeri/{pasazer.id}",
        headers=auth_headers("ridic@example.com"),
    )

    assert response.status_code == 400
    assert "1 hodinu před odjezdem" in _error_text(response)
