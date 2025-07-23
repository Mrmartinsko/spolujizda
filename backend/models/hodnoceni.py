from datetime import datetime

from models import db


class Hodnoceni(db.Model):
    __tablename__ = "hodnoceni"

    id = db.Column(db.Integer, primary_key=True)
    autor_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    cilovy_uzivatel_id = db.Column(
        db.Integer, db.ForeignKey("uzivatel.id"), nullable=False
    )
    role = db.Column(db.String(10), nullable=False)  # 'ridic' nebo 'pasazer'
    znamka = db.Column(db.Integer, nullable=False)  # 1-5
    komentar = db.Column(db.Text)
    datum = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, autor_id, cilovy_uzivatel_id, role, znamka, komentar=None):
        self.autor_id = autor_id
        self.cilovy_uzivatel_id = cilovy_uzivatel_id
        self.role = role
        self.znamka = znamka
        self.komentar = komentar

    def to_dict(self):
        return {
            "id": self.id,
            "autor_id": self.autor_id,
            "autor": self.autor.profil.to_dict() if self.autor.profil else None,
            "cilovy_uzivatel_id": self.cilovy_uzivatel_id,
            "role": self.role,
            "znamka": self.znamka,
            "komentar": self.komentar,
            "datum": self.datum.isoformat() if self.datum else None,
        }

    def __repr__(self):
        return f"<Hodnoceni {self.znamka}/5 pro {self.cilovy_uzivatel_id}>"
