"""add email verification fields + hodnoceni.jizda_id not null (sqlite-safe)

Revision ID: bd480a3ed0d0
Revises: 3c2a6cbb10d7
Create Date: 2026-02-16 13:36:18.799738
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "bd480a3ed0d0"
down_revision = "3c2a6cbb10d7"
branch_labels = None
depends_on = None


def _sqlite_column_exists(table_name: str, col_name: str) -> bool:
    conn = op.get_bind()
    rows = conn.exec_driver_sql(f"PRAGMA table_info({table_name});").fetchall()
    # PRAGMA table_info: (cid, name, type, notnull, dflt_value, pk)
    return any(r[1] == col_name for r in rows)


def _sqlite_column_notnull(table_name: str, col_name: str):
    conn = op.get_bind()
    rows = conn.exec_driver_sql(f"PRAGMA table_info({table_name});").fetchall()
    for r in rows:
        if r[1] == col_name:
            return bool(r[3])  # notnull
    return None


def upgrade():
    conn = op.get_bind()

    # když někdy zůstal temp stůl po pádu, uklidíme ho
    conn.exec_driver_sql("DROP TABLE IF EXISTS _alembic_tmp_hodnoceni;")

    # 1) hodnoceni.jizda_id -> NOT NULL (jen pokud ještě není)
    notnull = _sqlite_column_notnull("hodnoceni", "jizda_id")
    if notnull is False:
        with op.batch_alter_table("hodnoceni", schema=None) as batch_op:
            batch_op.alter_column(
                "jizda_id",
                existing_type=sa.INTEGER(),
                nullable=False,
            )

    # 2) uzivatel: přidej sloupce jen pokud neexistují
    if not _sqlite_column_exists("uzivatel", "email_verified"):
        conn.exec_driver_sql(
            "ALTER TABLE uzivatel ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0;"
        )

    if not _sqlite_column_exists("uzivatel", "email_verified_at"):
        conn.exec_driver_sql(
            "ALTER TABLE uzivatel ADD COLUMN email_verified_at DATETIME;"
        )


def downgrade():
    # SQLite downgrade přes DROP COLUMN je pain (musí se recreate tabulka).
    # Necháme no-op.
    pass
