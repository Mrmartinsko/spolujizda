def test_vytvoreni_rezervace_funguje(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    auth_headers,
):
    ridic = create_verified_user(email="ridic-rez@example.com", jmeno="Ridic Rezervace")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    create_verified_user(email="pasazer@example.com", jmeno="Pasazer Test")

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": [], "poznamka": "Prijdu vcas"},
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["rezervace"]["jizda_id"] == jizda.id
    assert data["rezervace"]["status"] == "cekajici"


def test_nelze_rezervovat_vlastni_jizdu(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    auth_headers,
):
    ridic = create_verified_user(email="vlastni@example.com", jmeno="Vlastni Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto)

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("vlastni@example.com"),
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Řidič nemůže rezervovat vlastní jízdu"


def test_nelze_rezervovat_plnou_jizdu(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="plna-ridic@example.com", jmeno="Plna Jizda Ridic")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, pocet_mist=1)

    prvni_pasazer = create_verified_user(email="obsazeno@example.com", jmeno="Obsazeny Pasazer")
    create_accepted_reservation(prvni_pasazer, jizda, pocet_mist=1)

    create_verified_user(email="dalsi@example.com", jmeno="Dalsi Pasazer")

    response = client.post(
        "/api/rezervace/",
        json={"jizda_id": jizda.id, "pocet_mist": 1, "dalsi_pasazeri": []},
        headers=auth_headers("dalsi@example.com"),
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Jízda je plně obsazená"
