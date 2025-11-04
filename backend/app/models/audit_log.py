"""AuditLog model for compliance tracking"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class AuditLog(Base):
    """Track all significant system changes for compliance"""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action = Column(String(100), nullable=False, index=True)  # CREATE, UPDATE, DELETE, VIEW
    resource_type = Column(String(100), nullable=False, index=True)  # patient, visit, prescription, region
    resource_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    before_state = Column(JSONB, nullable=True)  # State before change
    after_state = Column(JSONB, nullable=True)  # State after change
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User")

    # Indexes for audit log queries
    __table_args__ = (
        Index("ix_audit_log_resource", "resource_type", "resource_id", "created_at"),
        Index("ix_audit_log_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<AuditLog {self.action} {self.resource_type}:{self.resource_id}>"
