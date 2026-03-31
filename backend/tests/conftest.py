from datetime import timedelta
from itertools import count

import pytest
from sqlalchemy.pool import StaticPool

import routes.auth as auth_routes
from app import create_app
from models import db
from models.auto import Auto
from models.blokace import Blokace
from models.hodnoceni import Hodnoceni
from models.jizda import Jizda
from models.oznameni import Oznameni
from models.profil import Profil
from models.rezervace import Rezervace
from models.uzivatel import Uzivatel
from utils.datetime_utils import utc_now


@pytest.fixture
def app():
    app = create_app(
        test_config={
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "SQLALCHEMY_ENGINE_OPTIONS": {
                "connect_args": {"check_same_thread": False},
                "poolclass": StaticPool,
            },
            "JWT_SECRET_KEY": "test-jwt-secret",
        }
    )

    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def mock_emails(monkeypatch):
    sent_emails = []

    def fake_verification_email(to_email, verify_url):
        sent_emails.append({"type": "verification", "to_email": to_email, "url": verify_url})

    def fake_password_reset_email(to_email, reset_url):
        sent_emails.append({"type": "password_reset", "to_email": to_email, "url": reset_url})

    monkeypatch.setattr(auth_routes, "send_verification_email", fake_verification_email)
    monkeypatch.setattr(auth_routes, "send_password_reset_email", fake_password_reset_email)
    return sent_emails


@pytest.fixture
def email_factory():
    counter = count(1)

    def _email_factory(prefix="user"):
        return f"{prefix}{next(counter)}@example.com"

    return _email_factory


@pytest.fixture
def user_factory(email_factory):
    def _user_factory(
        *,
        email=None,
        password="tajneheslo",
        jmeno="Test User",
        bio="",
        telefon=None,
        verified=True,
    ):
        uzivatel = Uzivatel(email=email or email_factory("user"), heslo=password)
        uzivatel.email_verified = verified
        uzivatel.email_verified_at = utc_now() if verified else None
        db.session.add(uzivatel)
        db.session.flush()

        profil = Profil(uzivatel_id=uzivatel.id, jmeno=jmeno, bio=bio)
        db.session.add(profil)
        db.session.commit()
        if telefon is not None:
            uzivatel.telefon = telefon
        return uzivatel

    return _user_factory


@pytest.fixture
def create_verified_user(user_factory):
    def _create_verified_user(**kwargs):
        kwargs.setdefault("verified", True)
        return user_factory(**kwargs)

    return _create_verified_user


@pytest.fixture
def create_unverified_user(user_factory):
    def _create_unverified_user(**kwargs):
        kwargs.setdefault("verified", False)
        return user_factory(**kwargs)

    return _create_unverified_user


@pytest.fixture
def login_user(client):
    def _login_user(email, password="tajneheslo"):
        return client.post("/api/auth/login", json={"email": email, "password": password})

    return _login_user


@pytest.fixture
def auth_headers(login_user):
    def _auth_headers(email, password="tajneheslo"):
        response = login_user(email, password)
        assert response.status_code == 200, response.get_json()
        token = response.get_json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


@pytest.fixture
def create_auto():
    def _create_auto(
        uzivatel,
        *,
        znacka="Skoda",
        model="Octavia",
        barva="modra",
        spz="1AB2345",
        primarni=True,
        docasne=False,
        smazane=False,
    ):
        auto = Auto(
            profil_id=uzivatel.profil.id,
            znacka=znacka,
            model=model,
            barva=barva,
            spz=spz,
            primarni=primarni,
            docasne=docasne,
            smazane=smazane,
        )
        db.session.add(auto)
        db.session.commit()
        return auto

    return _create_auto


@pytest.fixture
def ride_payload():
    def _ride_payload(auto_id, *, departure=None, arrival=None, overrides=None):
        departure = departure or (utc_now() + timedelta(days=1))
        arrival = arrival or (departure + timedelta(hours=1))
        payload = {
            "auto_id": auto_id,
            "odkud": "Brno",
            "kam": "Praha",
            "cas_odjezdu": departure.isoformat(),
            "cas_prijezdu": arrival.isoformat(),
            "cena": 150,
            "pocet_mist": 3,
        }
        if overrides:
            payload.update(overrides)
        return payload

    return _ride_payload


@pytest.fixture
def create_ride():
    def _create_ride(
        ridic,
        auto,
        *,
        odkud="Brno",
        kam="Praha",
        departure=None,
        arrival=None,
        cena=150,
        pocet_mist=3,
        status="aktivni",
        odkud_place_id=None,
        kam_place_id=None,
        mezistanice=None,
    ):
        departure = departure or (utc_now() + timedelta(days=1))
        arrival = arrival or (departure + timedelta(hours=1))

        jizda = Jizda(
            ridic_id=ridic.id,
            auto_id=auto.id if auto else None,
            odkud=odkud,
            kam=kam,
            cas_odjezdu=departure,
            cas_prijezdu=arrival,
            cena=cena,
            pocet_mist=pocet_mist,
        )
        jizda.status = status
        jizda.odkud_place_id = odkud_place_id
        jizda.kam_place_id = kam_place_id
        db.session.add(jizda)
        db.session.flush()

        for poradi, stop in enumerate(mezistanice or [], start=1):
            from models.mezistanice import Mezistanice

            db.session.add(
                Mezistanice(
                    jizda_id=jizda.id,
                    misto=stop["misto"],
                    misto_place_id=stop.get("place_id"),
                    misto_address=stop.get("address"),
                    poradi=poradi,
                )
            )

        db.session.commit()
        return jizda

    return _create_ride


@pytest.fixture
def reservation_factory():
    def _reservation_factory(
        uzivatel,
        jizda,
        *,
        status="cekajici",
        pocet_mist=1,
        dalsi_pasazeri=None,
        poznamka="",
    ):
        rezervace = Rezervace(
            uzivatel_id=uzivatel.id,
            jizda_id=jizda.id,
            pocet_mist=pocet_mist,
            dalsi_pasazeri=dalsi_pasazeri or [],
            poznamka=poznamka,
        )
        rezervace.status = status
        db.session.add(rezervace)
        db.session.flush()

        if status == "prijata" and uzivatel not in jizda.pasazeri:
            jizda.pasazeri.append(uzivatel)

        db.session.commit()
        return rezervace

    return _reservation_factory


@pytest.fixture
def create_accepted_reservation(reservation_factory):
    def _create_accepted_reservation(uzivatel, jizda, *, pocet_mist=1, dalsi_pasazeri=None):
        return reservation_factory(
            uzivatel,
            jizda,
            status="prijata",
            pocet_mist=pocet_mist,
            dalsi_pasazeri=dalsi_pasazeri,
        )

    return _create_accepted_reservation


@pytest.fixture
def rating_factory():
    def _rating_factory(
        *,
        autor,
        cilovy,
        jizda,
        role="ridic",
        znamka=5,
        komentar="Skvela jizda",
    ):
        hodnoceni = Hodnoceni(
            autor_id=autor.id,
            cilovy_uzivatel_id=cilovy.id,
            jizda_id=jizda.id,
            role=role,
            znamka=znamka,
            komentar=komentar,
        )
        db.session.add(hodnoceni)
        db.session.commit()
        return hodnoceni

    return _rating_factory


@pytest.fixture
def block_factory():
    def _block_factory(*, blocker, blocked):
        blokace = Blokace(blokujici_id=blocker.id, blokovany_id=blocked.id)
        db.session.add(blokace)
        db.session.commit()
        return blokace

    return _block_factory


@pytest.fixture
def notification_factory():
    def _notification_factory(*, recipient, sender=None, zprava="Test oznameni", **kwargs):
        oznameni = Oznameni(
            prijemce_id=recipient.id,
            odesilatel_id=sender.id if sender else None,
            zprava=zprava,
            **kwargs,
        )
        db.session.add(oznameni)
        db.session.commit()
        return oznameni

    return _notification_factory


@pytest.fixture
def completed_ride_with_passenger(create_verified_user, create_auto, create_ride, create_accepted_reservation):
    def _completed_ride_with_passenger():
        ridic = create_verified_user(email="ridic-finished@example.com", jmeno="Hotovy Ridic")
        pasazer = create_verified_user(email="pasazer-finished@example.com", jmeno="Hotovy Pasazer")
        auto = create_auto(ridic, spz="9AB1234")
        departure = utc_now() - timedelta(hours=3)
        arrival = utc_now() - timedelta(hours=1)
        jizda = create_ride(
            ridic,
            auto,
            departure=departure,
            arrival=arrival,
            status="dokoncena",
        )
        rezervace = create_accepted_reservation(pasazer, jizda)
        return ridic, pasazer, auto, jizda, rezervace

    return _completed_ride_with_passenger
