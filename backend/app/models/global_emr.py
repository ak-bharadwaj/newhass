"""Global EMR model - Patient's complete medical history across all hospitals"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Index, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from app.core.database import Base


class GlobalEMR(Base):
    """
    Global Electronic Medical Record - Patient's complete medical history.

    This consolidates information from all hospital visits:
    - All diagnoses
    - All medications ever prescribed
    - All procedures performed
    - All allergies discovered
    - All chronic conditions
    - Complete visit history across all facilities

    Updated automatically on discharge from any hospital.
    """
    __tablename__ = "global_emr"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,  # One global EMR per patient
        index=True
    )

    # Medical history summary
    chronic_conditions = Column(JSONB, nullable=True, default=list)  # ["Diabetes Type 2", "Hypertension"]
    all_diagnoses = Column(JSONB, nullable=True, default=list)  # Historical diagnoses
    all_procedures = Column(JSONB, nullable=True, default=list)  # All procedures performed
    all_allergies = Column(JSONB, nullable=True, default=list)  # All known allergies

    # Medication history
    current_medications = Column(JSONB, nullable=True, default=list)  # Active medications
    medication_history = Column(JSONB, nullable=True, default=list)  # Past medications

    # Visit history across all hospitals
    visit_summary = Column(JSONB, nullable=True, default=list)  # Summary of all visits

    # Family history
    family_history = Column(JSONB, nullable=True)

    # Social history
    social_history = Column(JSONB, nullable=True)  # Smoking, alcohol, occupation, etc.

    # Immunization history
    immunizations = Column(JSONB, nullable=True, default=list)

    # Emergency information
    emergency_contacts = Column(JSONB, nullable=True, default=list)
    advance_directives = Column(Text, nullable=True)

    # Metadata
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_updated_by_hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    last_synced_from_visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="global_emr")
    last_updated_by_hospital = relationship("Hospital")
    last_synced_from_visit = relationship("Visit")

    def __repr__(self):
        return f"<GlobalEMR Patient: {self.patient_id}>"


class LocalVisitRecord(Base):
    """
    Local visit record - Timeline for a specific hospital visit.

    This is the LOCAL sheet - tracks everything that happened during THIS visit:
    - Daily vitals
    - Medications given
    - Doctor notes
    - Nurse observations
    - Lab tests
    - Procedures

    This is visit-specific and hospital-specific.
    """
    __tablename__ = "local_visit_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("visits.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One local record per visit
        index=True
    )
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Visit-specific timeline (chronological log of all events)
    timeline = Column(JSONB, nullable=True, default=list)

    # Daily summaries (one entry per day)
    daily_summaries = Column(JSONB, nullable=True, default=list)

    # Quick access counts
    total_vitals_recorded = Column(Integer, nullable=False, default=0)
    total_medications_given = Column(Integer, nullable=False, default=0)
    total_doctor_visits = Column(Integer, nullable=False, default=0)
    total_procedures = Column(Integer, nullable=False, default=0)
    total_lab_tests = Column(Integer, nullable=False, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    visit = relationship("Visit")
    patient = relationship("Patient")
    hospital = relationship("Hospital")

    def log_event(self, event_type: str, event_data: dict, timestamp: datetime = None):
        """Add event to timeline"""
        if not self.timeline:
            self.timeline = []

        event = {
            "type": event_type,
            "timestamp": (timestamp or datetime.utcnow()).isoformat(),
            "data": event_data
        }

        self.timeline.append(event)
        self.updated_at = datetime.utcnow()

    def __repr__(self):
        return f"<LocalVisitRecord Visit: {self.visit_id}>"
