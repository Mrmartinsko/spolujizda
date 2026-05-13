from datetime import datetime

from models import db
from models.hodnoceni import Hodnoceni
from models.jizda import Jizda
from models.uzivatel import Uzivatel
from utils.notifications import vytvorit_oznameni


def sync_pending_ratings_for_user(uzivatel_id, *, create_notifications=False):
    now = datetime.now()
    jizdy = (
        Jizda.query.join(Jizda.pasazeri)
        .filter(Uzivatel.id == uzivatel_id)
        .all()
    )

    pending = []
    changed = False

    for jizda in jizdy:
        if jizda.status == "aktivni" and jizda.cas_prijezdu and jizda.cas_prijezdu <= now:
            jizda.status = "dokoncena"
            changed = True

        if jizda.status != "dokoncena":
            continue

        existujici_hodnoceni = Hodnoceni.query.filter_by(
            autor_id=uzivatel_id,
            cilovy_uzivatel_id=jizda.ridic_id,
            jizda_id=jizda.id,
            role="ridic",
        ).first()

        if existujici_hodnoceni:
            continue

        pending.append(
            {
                "jizda_id": jizda.id,
                "jizda": jizda.to_dict(),
                "cilovy_uzivatel_id": jizda.ridic_id,
                "role": "ridic",
            }
        )

        if create_notifications:
            vytvorit_oznameni(
                uzivatel_id,
                f"Máš nevyřešené hodnocení řidiče pro jízdu {jizda.odkud} -> {jizda.kam}.",
                "hodnoceni_ceka",
                kategorie="hodnoceni",
                target_path=f"/ohodnotit/{jizda.id}/{jizda.ridic_id}",
                jizda_id=jizda.id,
                cilovy_uzivatel_id=jizda.ridic_id,
                unikatni_klic=f"hodnoceni:{uzivatel_id}:{jizda.id}",
                commit=False,
            )
            changed = True

    if changed:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    return pending