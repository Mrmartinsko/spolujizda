import json
from typing import TYPE_CHECKING

from models import db

if TYPE_CHECKING:
    from models.jizda import Jizda
    from models.uzivatel import Uzivatel


class Rezervace(db.Model):
    __tablename__ = "rezervace"

    id = db.Column(db.Integer, primary_key=True)
    uzivatel_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    jizda_id = db.Column(db.Integer, db.ForeignKey("jizda.id"), nullable=False)
    pocet_mist = db.Column(db.Integer, nullable=False, default=1)
    dalsi_pasazeri = db.Column(db.Text, nullable=False, default="[]")
    poznamka = db.Column(db.Text)
    status = db.Column(
        db.String(20), default="cekajici"
    )  # cekajici, prijata, odmitnuta

    # Relationships jsou definované v uzivatel.py a jizda.py jako backref

    def __init__(self, uzivatel_id, jizda_id, poznamka=None, pocet_mist=1, dalsi_pasazeri=None):
        self.uzivatel_id = uzivatel_id
        self.jizda_id = jizda_id
        self.poznamka = poznamka
        self.pocet_mist = pocet_mist
        self.set_dalsi_pasazeri(dalsi_pasazeri or [])

    def get_dalsi_pasazeri(self):
        try:
            data = json.loads(self.dalsi_pasazeri or "[]")
        except (TypeError, ValueError):
            return []

        return data if isinstance(data, list) else []

    def set_dalsi_pasazeri(self, pasazeri):
        self.dalsi_pasazeri = json.dumps(pasazeri or [], ensure_ascii=False)

    def prijmout(self):
        """Přijme rezervaci a přidá uživatele mezi pasažéry"""
        self.status = "prijata"
        # Přidá uživatele mezi pasažéry jízdy
        if self.uzivatel not in self.jizda.pasazeri:
            self.jizda.pasazeri.append(self.uzivatel)

    def odmitnout(self):
        """Odmítne rezervaci"""
        self.status = "odmitnuta"

    def zrusit(self):
        """Zruší rezervaci a odebere uživatele z pasažérů"""
        if self.status == "prijata" and self.uzivatel in self.jizda.pasazeri:
            self.jizda.pasazeri.remove(self.uzivatel)
        db.session.delete(self)

    def to_dict(self):
        return {
            "id": self.id,
            "uzivatel_id": self.uzivatel_id,
            "uzivatel": self.uzivatel.profil.to_dict()
            if self.uzivatel.profil
            else None,
            "jizda_id": self.jizda_id,
            "jizda": self.jizda.to_dict() if self.jizda else None,
            "pocet_mist": self.pocet_mist,
            "dalsi_pasazeri": self.get_dalsi_pasazeri(),
            "poznamka": self.poznamka,
            "status": self.status,
        }

    def __repr__(self):
        return f"<Rezervace {self.uzivatel_id} -> {self.jizda_id}>"
