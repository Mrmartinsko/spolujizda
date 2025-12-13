from datetime import datetime
from models import db

class Oznameni(db.Model):
    __tablename__ = 'oznameni'

    id = db.Column(db.Integer, primary_key=True)
    prijemce_id = db.Column(db.Integer, db.ForeignKey('uzivatel.id'), nullable=False)
    odesilatel_id = db.Column(db.Integer, db.ForeignKey('uzivatel.id'))
    zprava = db.Column(db.String(255), nullable=False)
    typ = db.Column(db.String(50))
    datum = db.Column(db.DateTime, default=datetime.utcnow)
    precteno = db.Column(db.Boolean, default=False)

    prijemce = db.relationship("Uzivatel", foreign_keys=[prijemce_id], backref="prijata_oznameni")
    odesilatel = db.relationship("Uzivatel", foreign_keys=[odesilatel_id], backref="odeslana_oznameni")