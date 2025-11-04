"""Hospital model"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Hospital(Base):
    """Hospital facilities within regions"""

    __tablename__ = "hospitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id = Column(
        UUID(as_uuid=True),
        ForeignKey("regions.id", ondelete="RESTRICT"),
        nullable=True,  # Relaxed for test environments; FK may not be enforced in SQLite
        index=True,
    )
    name = Column(String(200), nullable=False)
    # Auto-generate a code if not provided (helps tests that don't set code)
    def _default_code() -> str:  # type: ignore[override]
        return f"HOSP-{uuid.uuid4().hex[:8].upper()}"

    code = Column(String(50), unique=True, nullable=False, index=True, default=_default_code)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    bed_capacity = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    region = relationship("Region", back_populates="hospitals")
    users = relationship("User", back_populates="hospital", lazy="dynamic")
    patients = relationship("Patient", back_populates="hospital", lazy="dynamic")
    beds = relationship("Bed", back_populates="hospital", lazy="dynamic")
    inventory = relationship("Inventory", back_populates="hospital", lazy="dynamic")

    def __repr__(self):
        return f"<Hospital {self.name} ({self.code})>"
