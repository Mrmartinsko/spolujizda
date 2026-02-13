"""add zastavky

Revision ID: da90b3163164
Revises: 8a14ba7111c9
Create Date: 2026-02-12 10:24:33.061971
"""
from alembic import op
import sqlalchemy as sa

revision = "da90b3163164"
down_revision = "8a14ba7111c9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("jizda", schema=None) as batch_op:
        batch_op.alter_column(
            "auto_id",
            existing_type=sa.INTEGER(),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table("jizda", schema=None) as batch_op:
        batch_op.alter_column(
            "auto_id",
            existing_type=sa.INTEGER(),
            nullable=False,
        )
