"""Bed model for bed management"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Bed(Base):
    """Bed inventory and assignments"""

    __tablename__ = "beds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    bed_number = Column(String(20), nullable=False)
    ward = Column(String(100), nullable=False)  # ICU, General Ward, Private Room
    floor = Column(String(20), nullable=True)
    bed_type = Column(String(50), nullable=False)  # standard, icu, isolation
    status = Column(String(50), nullable=False, default="available", index=True)  # available, occupied, maintenance, reserved
    assigned_patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_visit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("visits.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    hospital = relationship("Hospital", back_populates="beds")
    assigned_patient = relationship("Patient", foreign_keys=[assigned_patient_id])
    visit = relationship("Visit", back_populates="beds")

    # Unique constraint on hospital_id and bed_number
    __table_args__ = (
        Index("ix_bed_hospital_number", "hospital_id", "bed_number", unique=True),
    )

    def __repr__(self):
        return f"<Bed {self.bed_number} - {self.ward} - {self.status}>"
