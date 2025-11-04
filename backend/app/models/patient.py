"""Patient model"""
from sqlalchemy import Column, String, Date, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Patient(Base):
    """Patient demographics and identification"""

    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    
    # DEPRECATED: Use PatientHospital link table instead
    # These fields exist for backward compatibility only
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=True,  # Now nullable - use PatientHospital link table
        index=True,
    )
    mrn = Column(String(50), nullable=True, index=True)  # Now nullable - use local_mrn in PatientHospital
    
    # Global patient identification fields (for cross-hospital search)
    national_id = Column(String(50), unique=True, nullable=True, index=True)
    passport_number = Column(String(50), unique=True, nullable=True, index=True)
    is_global_record = Column(Boolean, nullable=False, default=True)
    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    blood_group = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    allergies = Column(Text, nullable=True)
    medical_conditions = Column(JSONB, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    hospital = relationship("Hospital", back_populates="patients")
    hospital_links = relationship("PatientHospital", back_populates="patient", lazy="dynamic")
    visits = relationship("Visit", back_populates="patient", lazy="dynamic")
    vitals = relationship("Vitals", back_populates="patient", lazy="dynamic")
    nurse_logs = relationship("NurseLog", back_populates="patient", lazy="dynamic")
    lab_tests = relationship("LabTest", back_populates="patient", lazy="dynamic")
    prescriptions = relationship("Prescription", back_populates="patient", lazy="dynamic")
    appointments = relationship("Appointment", back_populates="patient", lazy="dynamic")
    global_emr = relationship("GlobalEMR", back_populates="patient", uselist=False)

    # Composite index for patient search
    __table_args__ = (
        Index("ix_patient_name_dob", "last_name", "first_name", "date_of_birth"),
    )

    def __repr__(self):
        return f"<Patient {self.mrn} - {self.first_name} {self.last_name}>"
