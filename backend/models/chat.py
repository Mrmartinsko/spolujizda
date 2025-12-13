from models import db


class Chat(db.Model):
    __tablename__ = "chat"

    id = db.Column(db.Integer, primary_key=True)
    jizda_id = db.Column(
        db.Integer, db.ForeignKey("jizda.id"), nullable=True
    )  # Null pro osobní chaty

    # Vztahy
    zpravy = db.relationship(
        "Zprava",
        backref="chat",
        cascade="all, delete-orphan",
        order_by="Zprava.cas.desc()",
    )

    # M:N vztah s účastníky
    ucastnici = db.relationship(
        "Uzivatel", secondary="ucastnici_chatu", back_populates="chaty"
    )

    def __init__(self, jizda_id=None):
        self.jizda_id = jizda_id

    def pridat_ucastnika(self, uzivatel):
        """Přidá účastníka do chatu"""
        if uzivatel not in self.ucastnici:
            self.ucastnici.append(uzivatel)

    def odebrat_ucastnika(self, uzivatel):
        """Odebere účastníka z chatu"""
        if uzivatel in self.ucastnici:
            self.ucastnici.remove(uzivatel)

    def muze_pristupovat(self, uzivatel_id):
        """Zkontroluje, zda může uživatel přistupovat k chatu"""
        uzivatel_id = int(uzivatel_id)
        return any(u.id == uzivatel_id for u in self.ucastnici)

    def to_dict(self):
        return {
            "id": self.id,
            "jizda_id": self.jizda_id,
            "jizda": self.jizda.to_dict() if self.jizda else None,
            "ucastnici": [u.profil.to_dict() for u in self.ucastnici if u.profil],
            "posledni_zprava": self.zpravy[0].to_dict() if self.zpravy else None,
        }

    def __repr__(self):
        chat_type = f"Jizda {self.jizda_id}" if self.jizda_id else "Osobni"
        return f"<Chat {chat_type}>"