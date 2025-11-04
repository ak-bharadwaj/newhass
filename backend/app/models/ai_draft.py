"""AIDraft model for AI approval workflow"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class AIDraft(Base):
    """AI-generated content awaiting doctor approval"""

    __tablename__ = "ai_drafts"

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
    draft_type = Column(String(100), nullable=False, index=True)  # risk_score, discharge_summary, treatment_plan, anomaly_alert
    content = Column(JSONB, nullable=False)  # AI-generated structured content
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, approved, rejected, expired
    created_by_system = Column(Boolean, nullable=False, default=True)
    reviewed_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    approval_notes = Column(Text, nullable=True)
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
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

    # Index for pending AI drafts queue
    __table_args__ = (
        Index("ix_ai_draft_status_created", "status", "created_at"),
    )

    def __repr__(self):
        return f"<AIDraft {self.draft_type} - {self.status}>"
