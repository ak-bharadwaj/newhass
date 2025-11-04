"""Inventory model for supplies tracking"""
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Inventory(Base):
    """Medical supplies, medications, and lab reagents tracking"""

    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hospitals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    item_type = Column(String(50), nullable=False, index=True)  # medication, supply, reagent, equipment
    item_name = Column(String(200), nullable=False)
    item_code = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Antibiotics, Bandages, Lab Reagents
    quantity = Column(Integer, nullable=False, default=0)
    unit = Column(String(50), nullable=False)  # tablets, ml, units, pieces
    threshold_alert = Column(Integer, nullable=False, default=10)  # alert when quantity < threshold
    expiry_date = Column(Date, nullable=True, index=True)
    location = Column(String(100), nullable=True)  # storage location
    supplier = Column(String(200), nullable=True)
    last_restocked_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    hospital = relationship("Hospital", back_populates="inventory")

    # Indexes for inventory queries and alerts
    __table_args__ = (
        Index("ix_inventory_hospital_code", "hospital_id", "item_code", unique=True),
        Index("ix_inventory_low_stock", "quantity", "threshold_alert"),
    )

    def __repr__(self):
        return f"<Inventory {self.item_name} - {self.quantity} {self.unit}>"
