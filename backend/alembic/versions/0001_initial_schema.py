"""Initial Crime OS AI schema."""

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create enum types explicitly in database
    op.execute("CREATE TYPE userrole AS ENUM ('IO', 'SHO', 'LEGAL')")
    op.execute("CREATE TYPE sourcetype AS ENUM ('pdf', 'image', 'audio', 'text')")
    op.execute("CREATE TYPE legalcode AS ENUM ('BNS', 'BNSS', 'BSA')")
    op.execute("CREATE TYPE stepstatus AS ENUM ('pending', 'in_progress', 'done', 'skipped')")
    op.execute("CREATE TYPE providertype AS ENUM ('telecom', 'bank', 'platform')")
    op.execute("CREATE TYPE requeststatus AS ENUM ('draft', 'approved', 'dispatched', 'responded')")

    # Define ENUM instances with create_type=False so SQLAlchemy doesn't recreate them
    role = postgresql.ENUM("IO", "SHO", "LEGAL", name="userrole", create_type=False)
    source_type = postgresql.ENUM("pdf", "image", "audio", "text", name="sourcetype", create_type=False)
    legal_code = postgresql.ENUM("BNS", "BNSS", "BSA", name="legalcode", create_type=False)
    step_status = postgresql.ENUM("pending", "in_progress", "done", "skipped", name="stepstatus", create_type=False)
    provider_type = postgresql.ENUM("telecom", "bank", "platform", name="providertype", create_type=False)
    request_status = postgresql.ENUM("draft", "approved", "dispatched", "responded", name="requeststatus", create_type=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", role, nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_table(
        "cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("crime_type", sa.String(length=120), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("case_number"),
    )
    op.create_table(
        "legal_sections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", legal_code, nullable=False),
        sa.Column("section_number", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sop_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("crime_type", sa.String(length=120), nullable=False),
        sa.Column("source_file", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "fallback_cache",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(length=120), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("response_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("purpose", "input_hash", name="uq_fallback_cache_key"),
    )
    op.create_table(
        "complaints",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("source_type", source_type, nullable=False),
        sa.Column("original_file_path", sa.String(length=500), nullable=True),
        sa.Column("detected_language", sa.String(length=64), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("translated_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sop_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sop_document_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(dim=768), nullable=False),
        sa.ForeignKeyConstraint(["sop_document_id"], ["sop_documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "investigation_paths",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("model_used", sa.String(length=120), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "case_sections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("legal_section_id", sa.Uuid(), nullable=False),
        sa.Column("ai_reasoning", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.ForeignKeyConstraint(["legal_section_id"], ["legal_sections.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "extracted_entities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("complaint_id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "path_steps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("path_id", sa.Uuid(), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sop_citation", sa.Text(), nullable=False),
        sa.Column("status", step_status, nullable=False),
        sa.Column("suggested_action_type", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["path_id"], ["investigation_paths.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "legal_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("path_step_id", sa.Uuid(), nullable=True),
        sa.Column("provider_type", provider_type, nullable=False),
        sa.Column("provider_name", sa.String(length=160), nullable=False),
        sa.Column("template_used", sa.String(length=120), nullable=False),
        sa.Column("generated_body", sa.Text(), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("status", request_status, nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.ForeignKeyConstraint(["path_step_id"], ["path_steps.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "case_summaries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "evidence_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("ai_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "provider_responses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("legal_request_id", sa.Uuid(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("parsed_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ai_insights", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["legal_request_id"], ["legal_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    tables: Sequence[str] = (
        "provider_responses",
        "evidence_files",
        "audit_events",
        "case_summaries",
        "legal_requests",
        "path_steps",
        "extracted_entities",
        "case_sections",
        "investigation_paths",
        "sop_chunks",
        "complaints",
        "fallback_cache",
        "sop_documents",
        "legal_sections",
        "cases",
        "users",
    )
    for table in tables:
        op.drop_table(table)
    for enum in ("requeststatus", "providertype", "stepstatus", "legalcode", "sourcetype", "userrole"):
        op.execute(f"DROP TYPE IF EXISTS {enum}")
