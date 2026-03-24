"""add place identity columns to rides and stops

Revision ID: 6d5d2622d2c1
Revises: 28f325d8aaf2
Create Date: 2026-03-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "6d5d2622d2c1"
down_revision = "28f325d8aaf2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("jizda", schema=None) as batch_op:
        batch_op.add_column(sa.Column("odkud_place_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("odkud_address", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("kam_place_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("kam_address", sa.String(length=255), nullable=True))
        batch_op.create_index(batch_op.f("ix_jizda_odkud_place_id"), ["odkud_place_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_jizda_kam_place_id"), ["kam_place_id"], unique=False)

    with op.batch_alter_table("mezistanice", schema=None) as batch_op:
        batch_op.add_column(sa.Column("misto_place_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("misto_address", sa.String(length=255), nullable=True))
        batch_op.create_index(batch_op.f("ix_mezistanice_misto_place_id"), ["misto_place_id"], unique=False)


def downgrade():
    with op.batch_alter_table("mezistanice", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_mezistanice_misto_place_id"))
        batch_op.drop_column("misto_address")
        batch_op.drop_column("misto_place_id")

    with op.batch_alter_table("jizda", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_jizda_kam_place_id"))
        batch_op.drop_index(batch_op.f("ix_jizda_odkud_place_id"))
        batch_op.drop_column("kam_address")
        batch_op.drop_column("kam_place_id")
        batch_op.drop_column("odkud_address")
        batch_op.drop_column("odkud_place_id")
