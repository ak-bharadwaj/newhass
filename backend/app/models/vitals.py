"""Vitals model for patient vital signs"""
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, Text, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Vitals(Base):
    """Patient vital signs time-series data"""

    __tablename__ = "vitals"

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
    recorded_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Vital signs measurements
    temperature = Column(Numeric(4, 1), nullable=True)  # Celsius
    heart_rate = Column(Integer, nullable=True)  # bpm
    blood_pressure_systolic = Column(Integer, nullable=True)  # mmHg
    blood_pressure_diastolic = Column(Integer, nullable=True)  # mmHg
    respiratory_rate = Column(Integer, nullable=True)  # breaths per minute
    spo2 = Column(Integer, nullable=True)  # oxygen saturation percentage
    weight = Column(Numeric(5, 2), nullable=True)  # kg
    height = Column(Numeric(5, 2), nullable=True)  # cm
    bmi = Column(Numeric(4, 2), nullable=True)  # calculated

    notes = Column(Text, nullable=True)
    is_abnormal = Column(Boolean, nullable=False, default=False, index=True)
    
    # Nurse acknowledgment fields (confirms vitals were reviewed and accurate)
    acknowledged_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledgment_notes = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="vitals")
    visit = relationship("Visit", back_populates="vitals")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    acknowledged_by_user = relationship("User", foreign_keys=[acknowledged_by])

    # Index for timeline queries
    __table_args__ = (
        Index("ix_vitals_visit_recorded", "visit_id", "recorded_at"),
    )

    def __repr__(self):
        return f"<Vitals Patient:{self.patient_id} Recorded:{self.recorded_at}>"
