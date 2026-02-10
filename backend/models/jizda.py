from datetime import datetime

from models import db


class Jizda(db.Model):
    __tablename__ = "jizda"

    id = db.Column(db.Integer, primary_key=True)
    ridic_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    auto_id = db.Column(db.Integer, db.ForeignKey("auto.id", ondelete="SET NULL"), nullable=True)
    odkud = db.Column(db.String(255), nullable=False)
    kam = db.Column(db.String(255), nullable=False)
    cas_odjezdu = db.Column(db.DateTime, nullable=False)
    cas_prijezdu = db.Column(db.DateTime, nullable=False)
    cena = db.Column(db.Float, nullable=False)
    pocet_mist = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="aktivni")
   

    # Vztahy
    rezervace = db.relationship(
        "Rezervace", backref="jizda", cascade="all, delete-orphan"
    )
    chat = db.relationship(
        "Chat", backref="jizda", uselist=False, cascade="all, delete-orphan"
    )

    # M:N vztah s pasažéry
    pasazeri = db.relationship(
        "Uzivatel", secondary="pasazeri", back_populates="jizdy_pasazer"
    )

    def __init__(
        self, ridic_id, auto_id, odkud, kam, cas_odjezdu, cas_prijezdu, cena, pocet_mist
    ):
        self.ridic_id = ridic_id
        self.auto_id = auto_id
        self.odkud = odkud
        self.kam = kam
        self.cas_odjezdu = cas_odjezdu
        self.cas_prijezdu = cas_prijezdu
        self.cena = cena
        self.pocet_mist = pocet_mist
        
    def get_volna_mista(self):
        """Vrátí počet volných míst"""
        obsazena_mista = len(self.pasazeri)
        return self.pocet_mist - obsazena_mista

    def muze_rezervovat(self, uzivatel_id):
        """Zkontroluje, zda může uživatel rezervovat místo"""
        if self.ridic_id == uzivatel_id:
            return False, "Řidič nemůže rezervovat vlastní jízdu"

        if self.get_volna_mista() <= 0:
            return False, "Jízda je plně obsazená"

        # Zkontroluje, zda už uživatel není pasažér
        for pasazer in self.pasazeri:
            if pasazer.id == uzivatel_id:
                return False, "Uživatel je již pasažérem této jízdy"

        return True, "OK"

    def to_dict(self):
        return {
            "id": self.id,
            "ridic_id": self.ridic_id,
            "ridic": self.ridic.profil.to_dict() if self.ridic.profil else None,
            "auto":(
                    self.auto.to_dict()
                    if self.auto is not None and self.auto.smazane is False
                    else {
                        "smazane": True,
                        "znacka": "Smazané auto",
                        "model": None,
                        "spz": None
                    }
            ),
            "odkud": self.odkud,
            "kam": self.kam,
            "cas_odjezdu": self.cas_odjezdu.isoformat() if self.cas_odjezdu else None,
            "cas_prijezdu": self.cas_prijezdu.isoformat()
            if self.cas_prijezdu
            else None,
            "cena": self.cena,
            "pocet_mist": self.pocet_mist,
            "volna_mista": self.get_volna_mista(),
            "status": self.status,
            "pasazeri": [p.profil.to_dict() for p in self.pasazeri if p.profil],
        }

    def __repr__(self):
        return f"<Jizda {self.odkud} -> {self.kam}>"
