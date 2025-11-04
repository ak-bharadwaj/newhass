"""Appointment model for scheduling"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Appointment(Base):
    """Appointment scheduling"""

    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    appointment_type = Column(String(100), nullable=False)  # consultation, follow-up, procedure
    status = Column(String(50), nullable=False, default="scheduled", index=True)  # scheduled, checked_in, in_progress, completed, cancelled, no_show
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", foreign_keys=[doctor_id])
    hospital = relationship("Hospital")
    created_by = relationship("User", foreign_keys=[created_by_id])

    # Indexes for scheduling conflict detection and queries
    __table_args__ = (
        Index("ix_appointment_doctor_scheduled", "doctor_id", "scheduled_at"),
        Index("ix_appointment_hospital_status_scheduled", "hospital_id", "status", "scheduled_at"),
    )

    def __repr__(self):
        return f"<Appointment {self.id} - {self.scheduled_at} - {self.status}>"
