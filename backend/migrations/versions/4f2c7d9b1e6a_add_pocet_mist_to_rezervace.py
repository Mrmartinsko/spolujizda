"""add pocet_mist to rezervace

Revision ID: 4f2c7d9b1e6a
Revises: 6d5d2622d2c1
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa


revision = "4f2c7d9b1e6a"
down_revision = "6d5d2622d2c1"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.add_column(sa.Column("pocet_mist", sa.Integer(), nullable=False, server_default="1"))


def downgrade():
    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.drop_column("pocet_mist")
