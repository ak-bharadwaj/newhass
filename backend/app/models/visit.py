"""Visit model for hospital admissions"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Visit(Base):
    """Hospital admissions and encounters"""

    __tablename__ = "visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    attending_doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    visit_type = Column(String(50), nullable=False)  # inpatient, outpatient, emergency
    admission_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    discharge_date = Column(DateTime(timezone=True), nullable=True, index=True)
    reason_for_visit = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active", index=True)  # active, discharged, transferred, deceased
    discharge_summary = Column(Text, nullable=True)
    
    # Priority system: 1=Emergency, 2=Inpatient, 3=Outpatient
    priority = Column(Integer, nullable=False, default=3, index=True)
    
    # Auto-sync tracking fields (for discharge sync to global database)
    is_synced_to_global = Column(Boolean, nullable=False, default=False)
    synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String(50), nullable=False, default="pending")  # pending, synced, failed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="visits")
    hospital = relationship("Hospital")
    attending_doctor = relationship("User", foreign_keys=[attending_doctor_id])
    vitals = relationship("Vitals", back_populates="visit", lazy="dynamic", cascade="all, delete-orphan")
    nurse_logs = relationship("NurseLog", back_populates="visit", lazy="dynamic", cascade="all, delete-orphan")
    lab_tests = relationship("LabTest", back_populates="visit", lazy="dynamic", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="visit", lazy="dynamic", cascade="all, delete-orphan")
    beds = relationship("Bed", back_populates="visit", lazy="dynamic")

    # Composite index for patient visit history
    __table_args__ = (
        Index("ix_visit_patient_status", "patient_id", "status"),
        Index("ix_visit_priority_status", "priority", "status"),
    )

    def __repr__(self):
        return f"<Visit {self.id} - Patient: {self.patient_id} - Status: {self.status}>"
