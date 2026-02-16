"""add jizda_id to hodnoceni (sqlite-safe recreate)

Revision ID: 3c2a6cbb10d7
Revises: da90b3163164
Create Date: (nech jak máš)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3c2a6cbb10d7"
down_revision = "da90b3163164"
branch_labels = None
depends_on = None


def upgrade():
    # SQLite neumí bezpečně přidávat/změnit constraints přes ALTER TABLE,
    # takže tabulku hodnoceni přestavíme ručně: new -> copy -> drop -> rename.

    # 1) vytvoř novou tabulku s novým sloupcem + novým UNIQUE constraintem
    op.create_table(
        "_hodnoceni_new",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("uzivatel.id"), nullable=False),
        sa.Column(
            "cilovy_uzivatel_id",
            sa.Integer(),
            sa.ForeignKey("uzivatel.id"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("znamka", sa.Integer(), nullable=False),
        sa.Column("komentar", sa.Text(), nullable=True),
        sa.Column("datum", sa.DateTime(), nullable=True),

        # nový sloupec (v téhle migraci ho necháme nullable=True)
        sa.Column("jizda_id", sa.Integer(), sa.ForeignKey("jizda.id"), nullable=True),

        # nový unikátní constraint (podle toho co ti Alembic už generoval)
        sa.UniqueConstraint(
            "autor_id",
            "cilovy_uzivatel_id",
            "jizda_id",
            "role",
            name="uq_hodnoceni_autor_cil_jizda_role",
        ),
    )

    # 2) překopíruj data ze staré tabulky (jizda_id zatím NULL)
    op.execute(
        """
        INSERT INTO _hodnoceni_new (id, autor_id, cilovy_uzivatel_id, role, znamka, komentar, datum, jizda_id)
        SELECT id, autor_id, cilovy_uzivatel_id, role, znamka, komentar, datum, NULL
        FROM hodnoceni
        """
    )

    # 3) smaž starou tabulku a přejmenuj novou
    op.drop_table("hodnoceni")
    op.rename_table("_hodnoceni_new", "hodnoceni")


def downgrade():
    # V downgrade vrátíme tabulku do stavu bez jizda_id
    op.create_table(
        "_hodnoceni_old",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("uzivatel.id"), nullable=False),
        sa.Column(
            "cilovy_uzivatel_id",
            sa.Integer(),
            sa.ForeignKey("uzivatel.id"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("znamka", sa.Integer(), nullable=False),
        sa.Column("komentar", sa.Text(), nullable=True),
        sa.Column("datum", sa.DateTime(), nullable=True),

        # původní UNIQUE constraint (pokud jsi ho měl dřív)
        # Pokud se u tebe jmenoval jinak, můžeš název změnit – SQLite to typicky neřeší tak přísně.
        sa.UniqueConstraint(
            "autor_id",
            "cilovy_uzivatel_id",
            "role",
            name="uq_hodnoceni_autor_cil_role",
        ),
    )

    op.execute(
        """
        INSERT INTO _hodnoceni_old (id, autor_id, cilovy_uzivatel_id, role, znamka, komentar, datum)
        SELECT id, autor_id, cilovy_uzivatel_id, role, znamka, komentar, datum
        FROM hodnoceni
        """
    )

    op.drop_table("hodnoceni")
    op.rename_table("_hodnoceni_old", "hodnoceni")
