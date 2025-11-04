"""Pydantic schemas for Region resources"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class RegionBase(BaseModel):
    """Base region schema"""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    theme_settings: Optional[dict] = None
    is_active: bool = True


class RegionCreate(RegionBase):
    """Schema for creating a region"""
    pass


class RegionUpdate(BaseModel):
    """Schema for updating a region"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    theme_settings: Optional[dict] = None
    is_active: Optional[bool] = None


class RegionResponse(RegionBase):
    """Schema for region response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RegionWithStats(RegionResponse):
    """Region with additional statistics"""
    hospitals_count: int
    active_beds: int
    total_staff: int
    total_patients: int

    class Config:
        from_attributes = True
