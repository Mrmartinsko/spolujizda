# Tabulka pro M:N vztah mezi chaty a účastníky
from models import db

ucastnici_chatu = db.Table(
    "ucastnici_chatu",
    db.Column("chat_id", db.Integer, db.ForeignKey("chat.id"), primary_key=True),
    db.Column(
        "uzivatel_id", db.Integer, db.ForeignKey("uzivatel.id"), primary_key=True
    ),
)
