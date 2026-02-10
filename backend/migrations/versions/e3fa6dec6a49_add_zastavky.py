"""add zastavky

Revision ID: e3fa6dec6a49
Revises: <DOPLŇ_PŘEDCHOZÍ_REVIZI>
Create Date: 2026-02-10 21:19:05.265019
"""

from alembic import op
import sqlalchemy as sa


revision = "e3fa6dec6a49"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "zastavka",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jizda_id", sa.Integer(), sa.ForeignKey("jizda.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nazev", sa.String(length=255), nullable=False),
        sa.Column("poradi", sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table("zastavka")
