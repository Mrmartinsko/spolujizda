from datetime import timedelta

import pytest

from models import db
from models.blokace import Blokace
from models.hodnoceni import Hodnoceni
from models.oznameni import Oznameni
from utils.datetime_utils import utc_now


def _error_text(response):
    data = response.get_json()
    return data.get("error") or data.get("msg")


def test_create_rating_after_completed_ride_success(
    client, completed_ride_with_passenger, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": 5,
            "komentar": "Super",
        },
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 201
    hodnoceni = Hodnoceni.query.one()
    assert hodnoceni.autor_id == pasazer.id
    assert hodnoceni.cilovy_uzivatel_id == ridic.id


def test_create_rating_before_completion_rejected(
    client, create_verified_user, create_auto, create_ride, create_accepted_reservation, auth_headers
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    auto = create_auto(ridic)
    jizda = create_ride(ridic, auto, status="aktivni")
    create_accepted_reservation(pasazer, jizda)

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": 5,
        },
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Hodnotit lze az po dokonceni jizdy"


def test_create_rating_rejects_self_rating(client, completed_ride_with_passenger, auth_headers):
    ridic, _, _, jizda, _ = completed_ride_with_passenger()

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "pasazer",
            "znamka": 5,
        },
        headers=auth_headers("ridic-finished@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Nemuzete hodnotit sebe sama"


@pytest.mark.parametrize("znamka", [0, 6, "spatne", None])
def test_create_rating_rejects_invalid_grade(
    client, completed_ride_with_passenger, auth_headers, znamka
):
    ridic, _, _, jizda, _ = completed_ride_with_passenger()

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": znamka,
        },
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Znamka musi byt cislo od 1 do 5"


def test_create_rating_rejects_duplicate_role(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic")

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": 4,
        },
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Hodnoceni pro tuto jizdu uz existuje"


def test_create_rating_rejects_non_participant(
    client, completed_ride_with_passenger, create_verified_user, auth_headers
):
    ridic, _, _, jizda, _ = completed_ride_with_passenger()
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": 5,
        },
        headers=auth_headers("cizi@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Tuto jizdu jste nejel"
    assert cizi.id != ridic.id


def test_create_rating_rejects_target_outside_ride(
    client, completed_ride_with_passenger, create_verified_user, auth_headers
):
    _, pasazer, _, jizda, _ = completed_ride_with_passenger()
    cizi = create_verified_user(email="cizi@example.com", jmeno="Cizi")

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": cizi.id,
            "role": "ridic",
            "znamka": 5,
        },
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Cilovy uzivatel nebyl ucastnikem teto jizdy"


def test_create_rating_rejects_wrong_role_direction(
    client,
    create_verified_user,
    create_auto,
    create_ride,
    create_accepted_reservation,
    auth_headers,
):
    ridic = create_verified_user(email="ridic@example.com", jmeno="Ridic")
    pasazer = create_verified_user(email="pasazer@example.com", jmeno="Pasazer")
    druhy_pasazer = create_verified_user(email="druhy@example.com", jmeno="Druhy")
    auto = create_auto(ridic)
    jizda = create_ride(
        ridic,
        auto,
        departure=utc_now() - timedelta(hours=3),
        arrival=utc_now() - timedelta(hours=1),
        status="dokoncena",
    )
    create_accepted_reservation(pasazer, jizda)
    create_accepted_reservation(druhy_pasazer, jizda)

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": druhy_pasazer.id,
            "role": "pasazer",
            "znamka": 5,
        },
        headers=auth_headers("pasazer@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Pasazera muze hodnotit pouze ridic z teto jizdy"
    assert ridic.id != pasazer.id


def test_update_rating_by_author_success(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    hodnoceni = rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic", znamka=4)

    response = client.put(
        f"/api/hodnoceni/{hodnoceni.id}",
        json={"znamka": 5, "komentar": "Jeste lepsi"},
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(hodnoceni)
    assert hodnoceni.znamka == 5
    assert hodnoceni.komentar == "Jeste lepsi"


def test_update_rating_rejects_foreign_author(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    hodnoceni = rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic")

    response = client.put(
        f"/api/hodnoceni/{hodnoceni.id}",
        json={"znamka": 2},
        headers=auth_headers("ridic-finished@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemate opravneni upravovat toto hodnoceni"


def test_update_rating_rejects_invalid_grade(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    hodnoceni = rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic")

    response = client.put(
        f"/api/hodnoceni/{hodnoceni.id}",
        json={"znamka": 9},
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Znamka musi byt cislo od 1 do 5"


def test_delete_rating_by_author_success(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    hodnoceni = rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic")

    response = client.delete(
        f"/api/hodnoceni/{hodnoceni.id}",
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 200
    assert Hodnoceni.query.count() == 0


def test_delete_rating_rejects_foreign_user(
    client, completed_ride_with_passenger, rating_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    hodnoceni = rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic")

    response = client.delete(
        f"/api/hodnoceni/{hodnoceni.id}",
        headers=auth_headers("ridic-finished@example.com"),
    )

    assert response.status_code == 403
    assert _error_text(response) == "Nemate opravneni smazat toto hodnoceni"


def test_get_user_ratings_stats(client, completed_ride_with_passenger, rating_factory, auth_headers):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic", znamka=4)

    response = client.get(
        f"/api/hodnoceni/uzivatel/{ridic.id}",
        headers=auth_headers("ridic-finished@example.com"),
    )

    assert response.status_code == 200
    data = response.get_json()["statistiky"]
    assert data["celkem"] == 1
    assert data["prumer"] == 4.0


def test_get_my_ratings(client, completed_ride_with_passenger, rating_factory, auth_headers):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    rating_factory(autor=pasazer, cilovy=ridic, jizda=jizda, role="ridic", znamka=4)

    response = client.get("/api/hodnoceni/moje", headers=auth_headers("pasazer-finished@example.com"))

    assert response.status_code == 200
    data = response.get_json()
    assert len(data["dana_hodnoceni"]) == 1
    assert data["dostana_hodnoceni"] == []


def test_pending_ratings_returns_completed_unrated_ride(
    client, completed_ride_with_passenger, auth_headers
):
    _, _, _, jizda, _ = completed_ride_with_passenger()

    response = client.get(
        "/api/hodnoceni/pending",
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 200
    pending = response.get_json()["pending"]
    assert len(pending) == 1
    assert pending[0]["jizda_id"] == jizda.id


@pytest.mark.parametrize(
    ("method", "url"),
    [
        ("get", "/api/auth/me"),
        ("post", "/api/auth/change-password"),
        ("post", "/api/jizdy/"),
        ("put", "/api/uzivatele/profil"),
        ("post", "/api/auta/moje-nove"),
        ("post", "/api/rezervace/"),
        ("get", "/api/hodnoceni/moje"),
        ("get", "/api/blokace/"),
    ],
)
def test_protected_endpoints_require_token(client, method, url):
    kwargs = {}
    if method in {"post", "put"}:
        kwargs["json"] = {}

    response = getattr(client, method)(url, **kwargs)

    assert response.status_code == 401


def test_block_user_success(client, create_verified_user, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")

    response = client.post(
        f"/api/blokace/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 201
    assert Blokace.query.count() == 1
    assert response.get_json()["blokace"]["blokovany_id"] == other.id
    assert current.id != other.id


def test_block_user_rejects_self(client, create_verified_user, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")

    response = client.post(
        f"/api/blokace/{current.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Nemuzete blokovat sebe sama"


def test_block_user_rejects_duplicate(client, create_verified_user, block_factory, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=current, blocked=other)

    response = client.post(
        f"/api/blokace/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 400
    assert _error_text(response) == "Uzivatel je jiz blokovan"


def test_unblock_user_success(client, create_verified_user, block_factory, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=current, blocked=other)

    response = client.delete(
        f"/api/blokace/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 200
    assert Blokace.query.count() == 0


def test_get_blocked_users_list(client, create_verified_user, block_factory, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=current, blocked=other)

    response = client.get("/api/blokace/", headers=auth_headers("ja@example.com"))

    assert response.status_code == 200
    assert response.get_json()["celkem"] == 1
    assert response.get_json()["blokovani_uzivatele"][0]["id"] == other.id


def test_check_block_status(client, create_verified_user, block_factory, auth_headers):
    current = create_verified_user(email="ja@example.com", jmeno="Ja")
    other = create_verified_user(email="on@example.com", jmeno="On")
    block_factory(blocker=current, blocked=other)

    response = client.get(
        f"/api/blokace/kontrola/{other.id}",
        headers=auth_headers("ja@example.com"),
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["ja_blokuji"] is True
    assert data["muze_komunikovat"] is False


def test_blocked_profile_access_via_user_endpoint(
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


def test_pending_rating_notification_is_marked_read_after_rating(
    client, completed_ride_with_passenger, notification_factory, auth_headers
):
    ridic, pasazer, _, jizda, _ = completed_ride_with_passenger()
    notification_factory(
        recipient=pasazer,
        zprava="Mas nevyresene hodnoceni",
        typ="hodnoceni_ceka",
        jizda_id=jizda.id,
        cilovy_uzivatel_id=ridic.id,
    )

    response = client.post(
        "/api/hodnoceni/",
        json={
            "jizda_id": jizda.id,
            "cilovy_uzivatel_id": ridic.id,
            "role": "ridic",
            "znamka": 5,
        },
        headers=auth_headers("pasazer-finished@example.com"),
    )

    assert response.status_code == 201
    notification = Oznameni.query.one()
    assert notification.precteno is True


def test_profile_update_endpoint_only_modifies_authenticated_user(
    client, create_verified_user, auth_headers
):
    owner = create_verified_user(email="owner@example.com", jmeno="Owner")
    other = create_verified_user(email="other@example.com", jmeno="Other")

    response = client.put(
        "/api/uzivatele/profil",
        json={"jmeno": "Prepsano"},
        headers=auth_headers("other@example.com"),
    )

    assert response.status_code == 200
    db.session.refresh(owner.profil)
    db.session.refresh(other.profil)
    assert owner.profil.jmeno == "Owner"
    assert other.profil.jmeno == "Prepsano"
