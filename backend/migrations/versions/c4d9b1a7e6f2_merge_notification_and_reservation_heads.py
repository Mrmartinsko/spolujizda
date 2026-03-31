"""merge notification and reservation migration heads

Revision ID: c4d9b1a7e6f2
Revises: 7a8f1c2d9b4e, f1c3b5d9e2a1
Create Date: 2026-03-29 00:00:01.000000
"""


revision = "c4d9b1a7e6f2"
down_revision = ("7a8f1c2d9b4e", "f1c3b5d9e2a1")
branch_labels = None
depends_on = None


def upgrade():
    # Merge migration only joins two heads, so there is no schema change to apply.
    pass


def downgrade():
    # Downgrade is also intentionally empty because this revision only merges heads.
    pass
