"""API Key model for programmatic access"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class ApiKey(Base):
    """API keys for service-to-service or admin integrations"""

    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    prefix = Column(String(16), nullable=False, index=True)  # public prefix for identification
    hashed_key = Column(String(128), nullable=False)
    scopes = Column(JSONB, nullable=True)  # list of scopes/permissions

    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)

    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    created_by = relationship("User")

    __table_args__ = (
        Index("ix_api_keys_prefix_unique", "prefix", unique=True),
    )
