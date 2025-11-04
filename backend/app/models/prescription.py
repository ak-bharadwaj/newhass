"""Prescription model for medication orders"""
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, Text, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Prescription(Base):
    """Medication orders and administration tracking"""

    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    visit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("visits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prescribed_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=False)  # 500mg
    frequency = Column(String(100), nullable=False)  # twice daily, every 6 hours
    route = Column(String(50), nullable=False)  # oral, IV, IM, subcutaneous, topical, inhalation, rectal
    duration_days = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active", index=True)  # active, dispensed, completed, discontinued, cancelled
    dispensed_at = Column(DateTime(timezone=True), nullable=True)
    dispensed_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    administered_at = Column(DateTime(timezone=True), nullable=True)
    administered_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Medication administration acknowledgment fields (nurse confirms administration)
    administration_notes = Column(String(500), nullable=True)
    administration_confirmed = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")
    visit = relationship("Visit", back_populates="prescriptions")
    prescribed_by = relationship("User", foreign_keys=[prescribed_by_id])
    dispensed_by = relationship("User", foreign_keys=[dispensed_by_id])
    administered_by = relationship("User", foreign_keys=[administered_by_id])

    # Indexes for prescription queries
    __table_args__ = (
        Index("ix_prescription_patient_status", "patient_id", "status"),
        Index("ix_prescription_visit_status", "visit_id", "status"),
    )

    def __repr__(self):
        return f"<Prescription {self.medication_name} - {self.status}>"
