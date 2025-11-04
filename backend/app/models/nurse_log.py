"""NurseLog model for nursing observations"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class NurseLog(Base):
    """Nursing observations and care notes"""

    __tablename__ = "nurse_logs"

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
    nurse_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    log_type = Column(String(50), nullable=False)  # observation, care_activity, incident, note, handoff
    content = Column(Text, nullable=False)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="nurse_logs")
    visit = relationship("Visit", back_populates="nurse_logs")
    nurse = relationship("User", foreign_keys=[nurse_id])

    # Index for timeline queries
    __table_args__ = (
        Index("ix_nurse_log_visit_logged", "visit_id", "logged_at"),
    )

    def __repr__(self):
        return f"<NurseLog {self.log_type} - Patient:{self.patient_id}>"
