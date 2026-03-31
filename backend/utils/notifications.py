import logging

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models import db
from models.oznameni import Oznameni
from utils.datetime_utils import utc_now


DEFAULT_CATEGORY_BY_TYPE = {
    "chat": "zpravy",
    "rezervace_nova": "rezervace",
    "rezervace_prijata": "rezervace",
    "rezervace_odmitnuta": "rezervace",
    "jizda_zmena": "jizdy",
    "hodnoceni_ceka": "hodnoceni",
}

logger = logging.getLogger(__name__)


def get_notification_category(notification_type, explicit_category=None):
    return explicit_category or DEFAULT_CATEGORY_BY_TYPE.get(notification_type, "ostatni")


def get_notification_target_path(notification):
    if notification.target_path:
        return notification.target_path

    if notification.typ == "chat" and notification.odesilatel_id:
        return f"/chat/{notification.odesilatel_id}"

    if notification.rezervace_id:
        return f"/moje-rezervace?focusReservation={notification.rezervace_id}"

    if notification.jizda_id:
        return f"/moje-jizdy?focusRide={notification.jizda_id}"

    return None


def serialize_notification(notification):
    return {
        "id": notification.id,
        "zprava": notification.zprava,
        "datum": notification.datum.isoformat(),
        "precteno": notification.precteno,
        "typ": notification.typ,
        "kategorie": get_notification_category(notification.typ, notification.kategorie),
        "odesilatel_id": notification.odesilatel_id,
        "cilovy_uzivatel_id": notification.cilovy_uzivatel_id,
        "jizda_id": notification.jizda_id,
        "rezervace_id": notification.rezervace_id,
        "target_path": get_notification_target_path(notification),
    }


def vytvorit_oznameni(
    prijemce_id,
    zprava,
    typ=None,
    *,
    kategorie=None,
    odesilatel_id=None,
    target_path=None,
    jizda_id=None,
    rezervace_id=None,
    cilovy_uzivatel_id=None,
    unikatni_klic=None,
    commit=True,
):
    try:
        if odesilatel_id is None:
            try:
                verify_jwt_in_request()
                odesilatel_id = int(get_jwt_identity())
            except Exception:
                odesilatel_id = None

        if unikatni_klic:
            existujici = Oznameni.query.filter_by(unikatni_klic=unikatni_klic).first()
            if existujici:
                return existujici

        nove_oznameni = Oznameni(
            prijemce_id=prijemce_id,
            odesilatel_id=odesilatel_id,
            zprava=zprava,
            typ=typ,
            kategorie=get_notification_category(typ, kategorie),
            target_path=target_path,
            jizda_id=jizda_id,
            rezervace_id=rezervace_id,
            cilovy_uzivatel_id=cilovy_uzivatel_id,
            unikatni_klic=unikatni_klic,
            datum=utc_now(),
            precteno=False,
        )

        db.session.add(nove_oznameni)

        if commit:
            db.session.commit()

        return nove_oznameni

    except Exception:
        db.session.rollback()
        logger.exception("Chyba pri vytvareni oznameni")
        return None
