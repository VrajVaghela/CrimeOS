"""Initial schema — VideoCase, ChronologicalLog, LedgerEntry

Revision ID: 0001
Revises: None
Create Date: 2026-07-09

Creates the core tables:
    - video_cases: Uploaded video cases and analysis state
    - chronological_logs: AI-generated timeline entries per case
    - ledger_entries: Tamper-evident hash-chained audit log (append-only)

Also creates:
    - Enum types: case_status, risk_level, ledger_event_type
    - Indexes: status, case_id+sequence_order composite, ledger case_id
    - Trigger: Blocks UPDATE and DELETE on ledger_entries for append-only guarantee
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY


# revision identifiers, used by Alembic
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum Types ───────────────────────────────────────────────────────
    case_status = sa.Enum(
        "UPLOADED", "PROCESSING", "ACTIVE_ANALYSIS", "COMPLETED", "FAILED",
        name="case_status",
    )
    risk_level = sa.Enum("LOW", "MEDIUM", "HIGH", name="risk_level")
    ledger_event_type = sa.Enum(
        "FILE_UPLOADED", "ANALYSIS_STARTED", "GEMINI_UPLOAD_COMPLETE",
        "INCIDENT_REPORT_GENERATED", "GEMINI_FILE_DELETED",
        "ANALYSIS_COMPLETED", "ANALYSIS_FAILED",
        name="ledger_event_type",
    )

    # case_status.create(op.get_bind(), checkfirst=True)
    # risk_level.create(op.get_bind(), checkfirst=True)
    # ledger_event_type.create(op.get_bind(), checkfirst=True)

    # ── video_cases ──────────────────────────────────────────────────────
    op.create_table(
        "video_cases",
        sa.Column(
            "id", UUID(as_uuid=False),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("original_md5", sa.String(32), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column(
            "status", case_status,
            nullable=False, server_default="UPLOADED",
        ),
        sa.Column("risk_evaluation", risk_level, nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("final_ledger_hash", sa.String(64), nullable=True),
        sa.Column("gemini_file_uri", sa.Text(), nullable=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_video_cases_status", "video_cases", ["status"])

    # ── chronological_logs ───────────────────────────────────────────────
    op.create_table(
        "chronological_logs",
        sa.Column(
            "id", sa.BigInteger(),
            primary_key=True, autoincrement=True,
        ),
        sa.Column(
            "case_id", UUID(as_uuid=False),
            sa.ForeignKey("video_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timestamp_in_video", sa.Text(), nullable=False),
        sa.Column("timestamp_seconds", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("entities_detected", ARRAY(sa.Text()), nullable=True),
        sa.Column("risk_level", risk_level, nullable=False),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_chronological_logs_case_sequence",
        "chronological_logs",
        ["case_id", "sequence_order"],
        unique=True,
    )

    # ── ledger_entries ───────────────────────────────────────────────────
    op.create_table(
        "ledger_entries",
        sa.Column(
            "id", sa.BigInteger(),
            primary_key=True, autoincrement=True,
        ),
        sa.Column(
            "case_id", UUID(as_uuid=False),
            sa.ForeignKey("video_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", ledger_event_type, nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("prev_hash", sa.String(64), nullable=False),
        sa.Column("signature", sa.Text(), nullable=False),
        sa.Column("payload_snapshot", JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_ledger_entries_case_id", "ledger_entries", ["case_id"]
    )

    # ── Append-Only Trigger on ledger_entries ────────────────────────────
    # Block UPDATE and DELETE operations to enforce the append-only
    # guarantee required for tamper-evident chain-of-custody tracking.
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_ledger_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'Ledger entries are append-only. UPDATE and DELETE operations are prohibited for chain-of-custody integrity.';
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER trg_ledger_no_update
        BEFORE UPDATE ON ledger_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_ledger_modification();
    """)

    op.execute("""
        CREATE TRIGGER trg_ledger_no_delete
        BEFORE DELETE ON ledger_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_ledger_modification();
    """)


def downgrade() -> None:
    # ── Drop triggers first ──────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS trg_ledger_no_delete ON ledger_entries;")
    op.execute("DROP TRIGGER IF EXISTS trg_ledger_no_update ON ledger_entries;")
    op.execute("DROP FUNCTION IF EXISTS prevent_ledger_modification();")

    # ── Drop tables ──────────────────────────────────────────────────────
    op.drop_table("ledger_entries")
    op.drop_table("chronological_logs")
    op.drop_table("video_cases")

    # ── Drop enum types ──────────────────────────────────────────────────
    sa.Enum(name="ledger_event_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="risk_level").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="case_status").drop(op.get_bind(), checkfirst=True)
