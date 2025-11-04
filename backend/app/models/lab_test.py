"""LabTest model for lab test management"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class LabTest(Base):
    """Lab test requests and results"""

    __tablename__ = "lab_tests"

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
    requested_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_to_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    test_type = Column(String(100), nullable=False)  # CBC, Lipid Panel, X-Ray, MRI
    urgency = Column(String(20), nullable=False, default="routine", index=True)  # routine, urgent, stat
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, accepted, in_progress, completed, cancelled
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    result_file_url = Column(Text, nullable=True)  # S3 URL to PDF report
    result_summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="lab_tests")
    visit = relationship("Visit", back_populates="lab_tests")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    # Index for lab queue queries
    __table_args__ = (
        Index("ix_lab_test_status_urgency", "status", "urgency", "requested_at"),
    )

    def __repr__(self):
        return f"<LabTest {self.test_type} - {self.status}>"
