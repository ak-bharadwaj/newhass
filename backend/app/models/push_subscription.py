"""Push subscription model for web push notifications"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class PushSubscription(Base):
    """Web push notification subscriptions"""

    __tablename__ = "push_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_data = Column(JSONB, nullable=False)  # Full subscription object from browser
    endpoint = Column(Text, nullable=False, unique=True)  # Push service endpoint
    device_info = Column(String(255), nullable=True)  # User agent / device name
    # Active flag should be a boolean
    is_active = Column(Boolean, nullable=False, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="push_subscriptions")

    # Indexes
    __table_args__ = (
        Index("ix_push_subscription_user_active", "user_id", "is_active"),
    )

    def __repr__(self):
        return f"<PushSubscription user={self.user_id} active={self.is_active}>"
