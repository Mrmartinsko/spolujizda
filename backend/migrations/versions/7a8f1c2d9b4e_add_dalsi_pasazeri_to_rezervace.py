"""add dalsi_pasazeri to rezervace

Revision ID: 7a8f1c2d9b4e
Revises: 4f2c7d9b1e6a
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa


revision = "7a8f1c2d9b4e"
down_revision = "4f2c7d9b1e6a"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("dalsi_pasazeri", sa.Text(), nullable=False, server_default="[]")
        )


def downgrade():
    with op.batch_alter_table("rezervace", schema=None) as batch_op:
        batch_op.drop_column("dalsi_pasazeri")
