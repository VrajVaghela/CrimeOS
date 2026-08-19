import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin
from app.models.enums import LegalCode


class LegalSection(UuidPkMixin, Base):
    __tablename__ = "legal_sections"

    code: Mapped[LegalCode] = mapped_column(Enum(LegalCode, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    section_number: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)


class CaseSection(UuidPkMixin, Base):
    __tablename__ = "case_sections"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    legal_section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legal_sections.id"), nullable=False)
    ai_reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", server_default="pending", nullable=False)

    legal_section = relationship("LegalSection")

