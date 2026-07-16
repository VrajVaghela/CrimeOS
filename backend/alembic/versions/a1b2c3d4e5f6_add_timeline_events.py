"""add_timeline_events

Revision ID: a1b2c3d4e5f6
Revises: 70d1356ca59c
Create Date: 2026-07-16 21:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "70d1356ca59c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "timeline_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=300), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source_ref", JSONB(), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("evidence_file_id", sa.UUID(), nullable=True),
        sa.Column("cctv_analysis", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evidence_file_id"], ["evidence_files.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timeline_events_case_id", "timeline_events", ["case_id"])
    op.create_index("ix_timeline_events_occurred_at", "timeline_events", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_timeline_events_occurred_at", table_name="timeline_events")
    op.drop_index("ix_timeline_events_case_id", table_name="timeline_events")
    op.drop_table("timeline_events")
