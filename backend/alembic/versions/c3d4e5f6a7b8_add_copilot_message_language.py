"""add copilot message language columns

Phase 14D — the copilot answers in the officer's selected language.
`message` keeps the authoritative English text (audit/legal record);
`message_localized` holds the display copy; `lang` records which language the
message was produced for so a reloaded chat history renders correctly.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "copilot_messages",
        sa.Column("message_localized", sa.String(length=10000), nullable=True),
    )
    op.add_column(
        "copilot_messages",
        sa.Column("lang", sa.String(length=2), server_default="en", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("copilot_messages", "lang")
    op.drop_column("copilot_messages", "message_localized")
