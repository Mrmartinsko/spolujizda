# Tabulka pro M:N vztah mezi jízdami a pasažéry
from models import db

pasazeri = db.Table(
    "pasazeri",
    db.Column("jizda_id", db.Integer, db.ForeignKey("jizda.id"), primary_key=True),
    db.Column("pasazer_id", db.Integer, db.ForeignKey("uzivatel.id"), primary_key=True),
)
