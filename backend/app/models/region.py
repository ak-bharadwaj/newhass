"""Region model for multi-tenancy"""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Region(Base):
    """Top-level organizational units (e.g., North Region, South Region)"""

    __tablename__ = "regions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    theme_settings = Column(JSONB, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    hospitals = relationship("Hospital", back_populates="region", lazy="dynamic")
    users = relationship("User", back_populates="region", lazy="dynamic")

    def __repr__(self):
        return f"<Region {self.name} ({self.code})>"
