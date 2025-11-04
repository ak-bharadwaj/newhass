"""Patient-Hospital relationship model for multi-hospital patient tracking"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class PatientHospital(Base):
    """
    Link table for patients across multiple hospitals.
    Allows same patient to visit different hospitals with unique MRN per hospital.
    """

    __tablename__ = "patient_hospitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Medical Record Number - unique PER HOSPITAL (not globally)
    mrn = Column(String(50), nullable=False)

    first_visit_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    last_visit_date = Column(DateTime(timezone=True), nullable=True, index=True)

    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Notes about this patient-hospital relationship
    notes = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="hospital_links")
    hospital = relationship("Hospital")

    # Indexes for performance and uniqueness
    __table_args__ = (
        # MRN must be unique per hospital (not globally)
        Index("ix_patient_hospital_mrn", "hospital_id", "mrn", unique=True),
        # Fast lookup of all hospitals for a patient
        Index("ix_patient_hospital_patient_active", "patient_id", "is_active"),
        # Fast lookup of all patients for a hospital
        Index("ix_patient_hospital_hospital_active", "hospital_id", "is_active"),
    )

    def __repr__(self):
        return f"<PatientHospital MRN:{self.mrn} Patient:{self.patient_id} Hospital:{self.hospital_id}>"
