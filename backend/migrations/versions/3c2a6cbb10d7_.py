"""add jizda_id to hodnoceni

Revision ID: 3c2a6cbb10d7
Revises: da90b3163164
Create Date: 2026-02-15
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3c2a6cbb10d7'
down_revision = 'da90b3163164'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('hodnoceni', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('jizda_id', sa.Integer(), nullable=True)
        )

        batch_op.create_foreign_key(
            'fk_hodnoceni_jizda_id',
            'jizda',
            ['jizda_id'],
            ['id']
        )

        batch_op.create_unique_constraint(
            'uq_hodnoceni_autor_cil_jizda_role',
            ['autor_id', 'cilovy_uzivatel_id', 'jizda_id', 'role']
        )


def downgrade():
    with op.batch_alter_table('hodnoceni', schema=None) as batch_op:
        batch_op.drop_constraint(
            'uq_hodnoceni_autor_cil_jizda_role',
            type_='unique'
        )

        batch_op.drop_constraint(
            'fk_hodnoceni_jizda_id',
            type_='foreignkey'
        )

        batch_op.drop_column('jizda_id')
