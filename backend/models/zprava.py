from datetime import datetime

from models import db


class Zprava(db.Model):
    __tablename__ = "zprava"

    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey("chat.id"), nullable=False)
    odesilatel_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    cas = db.Column(db.DateTime, default=datetime.utcnow)

    # Vztahy
    odesilatel = db.relationship("Uzivatel", backref="zpravy")

    def __init__(self, chat_id, odesilatel_id, text):
        self.chat_id = chat_id
        self.odesilatel_id = odesilatel_id
        self.text = text

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "odesilatel_id": self.odesilatel_id,
            "odesilatel": self.odesilatel.profil.to_dict()
            if self.odesilatel.profil
            else None,
            "text": self.text,
            "cas": self.cas.isoformat() if self.cas else None,
        }

    def __repr__(self):
        return f"<Zprava od {self.odesilatel_id}>"
