from models import db


class Rezervace(db.Model):
    __tablename__ = "rezervace"

    id = db.Column(db.Integer, primary_key=True)
    uzivatel_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    jizda_id = db.Column(db.Integer, db.ForeignKey("jizda.id"), nullable=False)
    poznamka = db.Column(db.Text)
    status = db.Column(
        db.String(20), default="cekajici"
    )  # cekajici, prijata, odmitnuta

    def __init__(self, uzivatel_id, jizda_id, poznamka=None):
        self.uzivatel_id = uzivatel_id
        self.jizda_id = jizda_id
        self.poznamka = poznamka

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
            "poznamka": self.poznamka,
            "status": self.status,
        }

    def __repr__(self):
        return f"<Rezervace {self.uzivatel_id} -> {self.jizda_id}>"
