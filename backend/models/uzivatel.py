import bcrypt

from models import db


class Uzivatel(db.Model):
    """Zakladni ucet aplikace s vazbami na profil, jizdy, rezervace a bezpecnostni data."""

    __tablename__ = "uzivatel"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    heslo = db.Column(db.String(128), nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    email_verification_token = db.Column(
        db.String(128), unique=True, index=True, nullable=True
    )
    email_verification_expires_at = db.Column(db.DateTime, nullable=True)
    password_reset_token = db.Column(db.String(128), unique=True, index=True, nullable=True)
    password_reset_expires_at = db.Column(db.DateTime, nullable=True)

    # Profil a rezervace se mazou spolu s uctem, aby nezustala sirotci data.
    profil = db.relationship(
        "Profil", backref="uzivatel", uselist=False, cascade="all, delete-orphan"
    )
    rezervace = db.relationship(
        "Rezervace", backref="uzivatel", cascade="all, delete-orphan"
    )
    jizdy_ridic = db.relationship(
        "Jizda",
        backref="ridic",
        foreign_keys="Jizda.ridic_id",
        cascade="all, delete-orphan",
    )

    # Ridic i pasazer maji vlastni vazby, aby slo jednoduse rozlisit roli v jizde.
    jizdy_pasazer = db.relationship(
        "Jizda", secondary="pasazeri", back_populates="pasazeri"
    )
    chaty = db.relationship(
        "Chat", secondary="ucastnici_chatu", back_populates="ucastnici"
    )

    # Smer blokace je dulezity: kdo blokuje a kdo je blokovany.
    blokujici = db.relationship(
        "Blokace",
        foreign_keys="Blokace.blokujici_id",
        backref="blokujici_uzivatel",
        cascade="all, delete-orphan",
    )
    blokovany = db.relationship(
        "Blokace", foreign_keys="Blokace.blokovany_id", backref="blokovany_uzivatel"
    )

    # Hodnoceni ma dve role: autor zpetne vazby a jeji cilovy uzivatel.
    hodnoceni_autor = db.relationship(
        "Hodnoceni",
        foreign_keys="Hodnoceni.autor_id",
        backref="autor",
        cascade="all, delete-orphan",
    )
    hodnoceni_cilovy = db.relationship(
        "Hodnoceni",
        foreign_keys="Hodnoceni.cilovy_uzivatel_id",
        backref="cilovy_uzivatel",
    )

    def __init__(self, email, heslo):
        self.email = email
        self.set_heslo(heslo)

    def set_heslo(self, heslo):
        """Pred ulozenim zahashuje heslo, aby v databazi nikdy nebyl otevreny text."""
        self.heslo = bcrypt.hashpw(heslo.encode("utf-8"), bcrypt.gensalt()).decode(
            "utf-8"
        )

    def check_heslo(self, heslo):
        """Porovna zadane heslo s ulozenym hashem bez vraceni puvodni hodnoty."""
        return bcrypt.checkpw(heslo.encode("utf-8"), self.heslo.encode("utf-8"))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "profil": self.profil.to_dict() if self.profil else None,
            "email_verified": self.email_verified,
        }

    def __repr__(self):
        return f"<Uzivatel {self.email}>"
