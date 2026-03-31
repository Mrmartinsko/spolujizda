from models import db
from utils.datetime_utils import utc_now

class Oznameni(db.Model):
    __tablename__ = 'oznameni'

    id = db.Column(db.Integer, primary_key=True)
    prijemce_id = db.Column(db.Integer, db.ForeignKey('uzivatel.id'), nullable=False)
    odesilatel_id = db.Column(db.Integer, db.ForeignKey('uzivatel.id'))
    zprava = db.Column(db.String(255), nullable=False)
    typ = db.Column(db.String(50))
    kategorie = db.Column(db.String(50))
    target_path = db.Column(db.String(255))
    jizda_id = db.Column(db.Integer, db.ForeignKey('jizda.id'))
    rezervace_id = db.Column(db.Integer, db.ForeignKey('rezervace.id'))
    cilovy_uzivatel_id = db.Column(db.Integer, db.ForeignKey('uzivatel.id'))
    unikatni_klic = db.Column(db.String(120), unique=True, nullable=True, index=True)
    datum = db.Column(db.DateTime, default=utc_now)
    precteno = db.Column(db.Boolean, default=False)

    prijemce = db.relationship("Uzivatel", foreign_keys=[prijemce_id], backref="prijata_oznameni")
    odesilatel = db.relationship("Uzivatel", foreign_keys=[odesilatel_id], backref="odeslana_oznameni")
    cilovy_uzivatel = db.relationship("Uzivatel", foreign_keys=[cilovy_uzivatel_id])
