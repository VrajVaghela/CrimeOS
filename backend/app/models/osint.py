import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func, BigInteger, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class OsintScan(UuidPkMixin, Base):
    __tablename__ = "osint_scans"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("case_entities.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_value: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="PENDING", nullable=False)  # PENDING, RUNNING, COMPLETED, FAILED
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    case = relationship("Case")
    entity = relationship("CaseEntity")
    social_profiles = relationship("SocialProfile", back_populates="scan", cascade="all, delete-orphan")
    breaches = relationship("DataBreach", back_populates="scan", cascade="all, delete-orphan")


class SocialProfile(UuidPkMixin, Base):
    __tablename__ = "social_profiles"

    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("osint_scans.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    profile_picture_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timezone_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    follower_count: Mapped[int | None] = mapped_column(nullable=True)
    follower_count_delta: Mapped[int | None] = mapped_column(nullable=True)
    bio_changed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location_changed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    exists_confidence: Mapped[str] = mapped_column(String(64), default="LIKELY", nullable=False)  # CONFIRMED, LIKELY, UNCERTAIN
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    scan = relationship("OsintScan", back_populates="social_profiles")


class DataBreach(UuidPkMixin, Base):
    __tablename__ = "data_breaches"

    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("osint_scans.id", ondelete="CASCADE"), nullable=False)
    breach_name: Mapped[str] = mapped_column(String(255), nullable=False)
    breach_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    leak_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    exposed_data_classes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    record_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    source_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    scan = relationship("OsintScan", back_populates="breaches")


class OsintSnapshot(UuidPkMixin, Base):
    __tablename__ = "osint_snapshots"

    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("osint_scans.id", ondelete="CASCADE"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("case_entities.id", ondelete="CASCADE"), nullable=False)
    snapshot_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case")
    entity = relationship("CaseEntity")
    scan = relationship("OsintScan")
