"""add notification targets and reservation queue metadata

Revision ID: f1c3b5d9e2a1
Revises: 6d5d2622d2c1
Create Date: 2026-03-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f1c3b5d9e2a1"
down_revision = "6d5d2622d2c1"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("oznameni", schema=None) as batch_op:
        batch_op.add_column(sa.Column("kategorie", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("target_path", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("jizda_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("rezervace_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("cilovy_uzivatel_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("unikatni_klic", sa.String(length=120), nullable=True))
        batch_op.create_index(batch_op.f("ix_oznameni_unikatni_klic"), ["unikatni_klic"], unique=True)
        batch_op.create_foreign_key("fk_oznameni_jizda_id", "jizda", ["jizda_id"], ["id"])
        batch_op.create_foreign_key("fk_oznameni_rezervace_id", "rezervace", ["rezervace_id"], ["id"])
        batch_op.create_foreign_key("fk_oznameni_cilovy_uzivatel_id", "uzivatel", ["cilovy_uzivatel_id"], ["id"])

    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("vytvoreno", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))
        )


def downgrade():
    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.drop_column("vytvoreno")

    with op.batch_alter_table("oznameni", schema=None) as batch_op:
        batch_op.drop_constraint("fk_oznameni_cilovy_uzivatel_id", type_="foreignkey")
        batch_op.drop_constraint("fk_oznameni_rezervace_id", type_="foreignkey")
        batch_op.drop_constraint("fk_oznameni_jizda_id", type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_oznameni_unikatni_klic"))
        batch_op.drop_column("unikatni_klic")
        batch_op.drop_column("cilovy_uzivatel_id")
        batch_op.drop_column("rezervace_id")
        batch_op.drop_column("jizda_id")
        batch_op.drop_column("target_path")
        batch_op.drop_column("kategorie")
