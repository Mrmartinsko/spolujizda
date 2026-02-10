from models import db

class Auto(db.Model):
    __tablename__ = "auto"

    id = db.Column(db.Integer, primary_key=True)
    profil_id = db.Column(db.Integer, db.ForeignKey("profil.id"), nullable=False)
    znacka = db.Column(db.String(50), nullable=False)
    model = db.Column(db.String(50), nullable=False)
    barva = db.Column(db.String(30))
    spz = db.Column(db.String(20))
    primarni = db.Column(db.Boolean, default=False)
    docasne = db.Column(db.Boolean, default=False)
    smazane = db.Column(db.Boolean, default=False)

    # Vztahy
    jizdy = db.relationship("Jizda", backref=db.backref("auto", passive_deletes=True))

    def __init__(
        self,
        profil_id,
        znacka,
        model,
        barva=None,
        spz=None,
        primarni=False,
        docasne=False,
        smazane=False
    ):
        self.profil_id = profil_id
        self.znacka = znacka
        self.model = model
        self.barva = barva
        self.spz = spz
        self.primarni = primarni
        self.docasne = docasne
        self.smazane = smazane

    def to_dict(self):
        return {
            "id": self.id,
            "profil_id": self.profil_id,
            "znacka": self.znacka,
            "model": self.model,
            "barva": self.barva,
            "spz": self.spz,
            "primarni": self.primarni,
            "docasne": self.docasne,
            "smazane": self.smazane
        }

    def __repr__(self):
        return f"<Auto {self.znacka} {self.model}>"

    def ma_aktivni_jizdy(self):
        """Vrátí True, pokud má auto nějaké aktivní jízdy"""
        from models.jizda import Jizda
        return Jizda.query.filter(
            Jizda.auto_id == self.id,
            Jizda.status == "aktivni"
        ).count() > 0

