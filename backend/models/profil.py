from models import db


class Profil(db.Model):
    __tablename__ = "profil"

    id = db.Column(db.Integer, primary_key=True)
    uzivatel_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    jmeno = db.Column(db.String(100), nullable=False)
    bio = db.Column(db.Text)
    fotka = db.Column(db.String(255))

    # Vztahy
    auta = db.relationship("Auto", backref="profil", cascade="all, delete-orphan")

    def __init__(self, uzivatel_id, jmeno, bio=None, fotka=None):
        self.uzivatel_id = uzivatel_id
        self.jmeno = jmeno
        self.bio = bio
        self.fotka = fotka

    def get_prumerne_hodnoceni(self, role=None):
        """Získá průměrné hodnocení pro danou roli"""
        hodnoceni = self.uzivatel.hodnoceni_cilovy
        if role:
            hodnoceni = [h for h in hodnoceni if h.role == role]

        if not hodnoceni:
            return 0

        return sum(h.znamka for h in hodnoceni) / len(hodnoceni)

    def to_dict(self):
        return {
            "id": self.id,
            "jmeno": self.jmeno,
            "bio": self.bio,
            "fotka": self.fotka,
            "hodnoceni_ridic": self.get_prumerne_hodnoceni("ridic"),
            "hodnoceni_pasazer": self.get_prumerne_hodnoceni("pasazer"),
            "pocet_aut": len([a for a in self.auta if not a.smazane]),
        }

    def __repr__(self):
        return f"<Profil {self}>".jmeno
