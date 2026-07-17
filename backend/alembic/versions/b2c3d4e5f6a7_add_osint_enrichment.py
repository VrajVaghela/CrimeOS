"""add_osint_enrichment

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-18 01:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add status column to case_entities
    op.add_column(
        "case_entities",
        sa.Column("status", sa.String(length=64), nullable=False, server_default="confirmed")
    )

    # 2. Create osint_scans table
    op.create_table(
        "osint_scans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_value", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="PENDING"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["entity_id"], ["case_entities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_osint_scans_entity_id", "osint_scans", ["entity_id"])
    op.create_index("ix_osint_scans_case_status", "osint_scans", ["case_id", "status"])

    # 3. Create social_profiles table
    op.create_table(
        "social_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scan_id", sa.UUID(), nullable=False),
        sa.Column("platform", sa.String(length=100), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("profile_url", sa.String(length=1000), nullable=False),
        sa.Column("profile_picture_url", sa.String(length=1000), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("location_hint", sa.String(length=255), nullable=True),
        sa.Column("timezone_hint", sa.String(length=255), nullable=True),
        sa.Column("follower_count", sa.Integer(), nullable=True),
        sa.Column("follower_count_delta", sa.Integer(), nullable=True),
        sa.Column("bio_changed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("location_changed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("exists_confidence", sa.String(length=64), nullable=False, server_default="LIKELY"),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["osint_scans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_social_profiles_scan_id", "social_profiles", ["scan_id"])
    op.create_index("ix_social_profiles_platform", "social_profiles", ["platform"])

    # 4. Create data_breaches table
    op.create_table(
        "data_breaches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scan_id", sa.UUID(), nullable=False),
        sa.Column("breach_name", sa.String(length=255), nullable=False),
        sa.Column("breach_domain", sa.String(length=255), nullable=True),
        sa.Column("leak_date", sa.String(length=10), nullable=True),
        sa.Column("exposed_data_classes", JSONB(), nullable=False),
        sa.Column("record_count", sa.BigInteger(), nullable=True),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("source_note", sa.Text(), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["osint_scans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_breaches_scan_id", "data_breaches", ["scan_id"])
    op.create_index("ix_data_breaches_severity", "data_breaches", ["severity"])

    # 5. Create osint_snapshots table
    op.create_table(
        "osint_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scan_id", sa.UUID(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("snapshot_data", JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["entity_id"], ["case_entities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["osint_scans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_osint_snapshots_entity_id", "osint_snapshots", ["entity_id"])
    op.create_index("ix_osint_snapshots_case_id", "osint_snapshots", ["case_id"])
    op.create_index("ix_osint_snapshots_scan_id", "osint_snapshots", ["scan_id"])


def downgrade() -> None:
    op.drop_index("ix_osint_snapshots_scan_id", table_name="osint_snapshots")
    op.drop_index("ix_osint_snapshots_case_id", table_name="osint_snapshots")
    op.drop_index("ix_osint_snapshots_entity_id", table_name="osint_snapshots")
    op.drop_table("osint_snapshots")

    op.drop_index("ix_data_breaches_severity", table_name="data_breaches")
    op.drop_index("ix_data_breaches_scan_id", table_name="data_breaches")
    op.drop_table("data_breaches")

    op.drop_index("ix_social_profiles_platform", table_name="social_profiles")
    op.drop_index("ix_social_profiles_scan_id", table_name="social_profiles")
    op.drop_table("social_profiles")

    op.drop_index("ix_osint_scans_case_status", table_name="osint_scans")
    op.drop_index("ix_osint_scans_entity_id", table_name="osint_scans")
    op.drop_table("osint_scans")

    op.drop_column("case_entities", "status")
