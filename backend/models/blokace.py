from models import db


class Blokace(db.Model):
    __tablename__ = "blokace"

    blokujici_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), primary_key=True)
    blokovany_id = db.Column(db.Integer, db.ForeignKey("uzivatel.id"), primary_key=True)

    def __init__(self, blokujici_id, blokovany_id):
        self.blokujici_id = blokujici_id
        self.blokovany_id = blokovany_id

    def to_dict(self):
        return {"blokujici_id": self.blokujici_id, "blokovany_id": self.blokovany_id}

    def __repr__(self):
        return f"<Blokace {self.blokujici_id} -> {self.blokovany_id}>"
