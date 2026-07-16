import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class SopDocument(UuidPkMixin, Base):
    __tablename__ = "sop_documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    crime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    source_file: Mapped[str] = mapped_column(String(255), nullable=False)

    chunks = relationship("SopChunk", back_populates="document")


class SopChunk(UuidPkMixin, Base):
    __tablename__ = "sop_chunks"

    sop_document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sop_documents.id"), nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)

    document = relationship("SopDocument", back_populates="chunks")
