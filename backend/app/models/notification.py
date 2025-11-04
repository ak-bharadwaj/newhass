"""Notification model for notification queue"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Notification(Base):
    """Notification queue and delivery logs"""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,  # Nullable for email-only notifications (patients without portal)
        index=True,
    )
    notification_type = Column(String(100), nullable=False)  # appointment_reminder, lab_result, emergency_alert, discharge_complete
    channel = Column(String(50), nullable=False, index=True)  # email, in_app
    recipient_address = Column(String(255), nullable=False)  # email address, phone number, etc.
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, sent, delivered, failed, cancelled
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    recipient = relationship("User")

    # Indexes for notification queue processing
    __table_args__ = (
        Index("ix_notification_status_created", "status", "created_at"),
        Index("ix_notification_recipient_created", "recipient_user_id", "created_at"),
    )

    def __repr__(self):
        return f"<Notification {self.notification_type} - {self.status}>"
