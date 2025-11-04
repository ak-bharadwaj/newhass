"""Pydantic schemas for Patient resources"""
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr


class PatientBase(BaseModel):
    """Base patient schema"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., description="male, female, other, prefer_not_to_say")
    blood_group: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    allergies: Optional[str] = None


class PatientCreate(PatientBase):
    """Schema for creating patient"""
    hospital_id: UUID


class PatientUpdate(BaseModel):
    """Schema for updating patient"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    is_active: Optional[bool] = None


class PatientResponse(PatientBase):
    """Schema for patient response"""
    id: UUID
    mrn: str
    hospital_id: UUID
    hospital_name: Optional[str] = None
    user_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientWithVitals(PatientResponse):
    """Patient with latest vitals"""
    latest_temperature: Optional[float] = None
    latest_heart_rate: Optional[int] = None
    latest_blood_pressure: Optional[str] = None
    latest_spo2: Optional[int] = None
    vitals_updated_at: Optional[datetime] = None
    has_abnormal_vitals: bool = False


class PaginatedPatients(BaseModel):
    """Paginated patients response"""
    patients: List[PatientResponse]
    total: int
    page: int
    page_size: int
