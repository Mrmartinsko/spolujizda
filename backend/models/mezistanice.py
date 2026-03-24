from models import db


class Mezistanice(db.Model):
    __tablename__ = "mezistanice"

    id = db.Column(db.Integer, primary_key=True)

    jizda_id = db.Column(
        db.Integer,
        db.ForeignKey("jizda.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    misto = db.Column(db.String(255), nullable=False)
    misto_place_id = db.Column(db.String(64), nullable=True, index=True)
    misto_address = db.Column(db.String(255), nullable=True)
    poradi = db.Column(db.Integer, nullable=False)

    # vztah zpátky na Jizda
    jizda = db.relationship("Jizda", back_populates="mezistanice")

    def __repr__(self):
        return f"<Mezistanice {self.misto} ({self.poradi}) pro jizda_id={self.jizda_id}>"
