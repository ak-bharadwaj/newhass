"""EMR models for Local and Global EMR"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class EMRLocal(Base):
    """Local hospital EMR records (flexible JSONB structure)"""

    __tablename__ = "emr_local"

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
        nullable=True,
        index=True,
    )
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    record_type = Column(String(100), nullable=False, index=True)  # clinical_note, discharge_summary, consultation
    data = Column(JSONB, nullable=False)  # Flexible structure for different record types
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
    patient = relationship("Patient")
    visit = relationship("Visit")
    hospital = relationship("Hospital")
    created_by = relationship("User", foreign_keys=[created_by_id])

    # Indexes for EMR queries
    __table_args__ = (
        Index("ix_emr_local_patient_created", "patient_id", "created_at"),
    )

    def __repr__(self):
        return f"<EMRLocal {self.record_type} - Patient:{self.patient_id}>"


class EMRGlobal(Base):
    """Global cross-facility EMR (synced from Local EMR post-discharge)"""

    __tablename__ = "emr_global"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    visit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("visits.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    record_type = Column(String(100), nullable=False, index=True)
    data = Column(JSONB, nullable=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient = relationship("Patient")
    visit = relationship("Visit")
    source_hospital = relationship("Hospital")

    # Indexes for global EMR queries
    __table_args__ = (
        Index("ix_emr_global_patient_synced", "patient_id", "synced_at"),
    )

    def __repr__(self):
        return f"<EMRGlobal {self.record_type} - Patient:{self.patient_id}>"
