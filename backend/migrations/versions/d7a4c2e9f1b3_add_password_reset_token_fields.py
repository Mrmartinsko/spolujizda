"""add password reset token fields

Revision ID: d7a4c2e9f1b3
Revises: c4d9b1a7e6f2
Create Date: 2026-03-29 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "d7a4c2e9f1b3"
down_revision = "c4d9b1a7e6f2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("uzivatel", schema=None) as batch_op:
        batch_op.add_column(sa.Column("password_reset_token", sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column("password_reset_expires_at", sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f("ix_uzivatel_password_reset_token"), ["password_reset_token"], unique=True)


def downgrade():
    with op.batch_alter_table("uzivatel", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_uzivatel_password_reset_token"))
        batch_op.drop_column("password_reset_expires_at")
        batch_op.drop_column("password_reset_token")
