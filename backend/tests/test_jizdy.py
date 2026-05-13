from datetime import datetime, timedelta


def test_vytvoreni_jizdy_funguje(client, create_verified_user, create_auto, auth_headers, ride_payload):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic Test")
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


def test_nelze_vytvorit_jizdu_v_minulosti(client, create_verified_user, create_auto, auth_headers, ride_payload):
    ridic = create_verified_user(email="minulost@example.com", jmeno="Minulost Test")
    auto = create_auto(ridic)

    departure = datetime.now() - timedelta(hours=2)
    arrival = departure + timedelta(hours=1)

    response = client.post(
        "/api/jizdy/",
        json=ride_payload(auto.id, departure=departure, arrival=arrival),
        headers=auth_headers("minulost@example.com"),
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Čas odjezdu musí být v budoucnosti"
