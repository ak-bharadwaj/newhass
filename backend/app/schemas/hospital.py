"""Pydantic schemas for Hospital resources"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr


class HospitalBase(BaseModel):
    """Base hospital schema"""
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    bed_capacity: int = Field(default=0, ge=0)
    is_active: bool = True


class HospitalCreate(HospitalBase):
    """Schema for creating a hospital"""
    region_id: UUID


class HospitalUpdate(BaseModel):
    """Schema for updating a hospital"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    bed_capacity: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class HospitalResponse(HospitalBase):
    """Schema for hospital response"""
    id: UUID
    region_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HospitalWithStats(HospitalResponse):
    """Hospital with additional statistics"""
    occupied_beds: int
    available_beds: int
    staff_count: int
    active_patients: int

    class Config:
        from_attributes = True
