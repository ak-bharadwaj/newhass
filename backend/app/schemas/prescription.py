"""Pydantic schemas for Prescription resources"""
from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class PrescriptionBase(BaseModel):
    """Base prescription schema"""
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=100, description="e.g., 500mg")
    frequency: str = Field(..., min_length=1, max_length=100, description="e.g., twice daily")
    route: str = Field(..., description="oral, IV, IM, subcutaneous, topical, inhalation, rectal")
    duration_days: Optional[int] = Field(None, ge=1)
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    """Schema for creating prescription"""
    patient_id: UUID
    visit_id: UUID


class PrescriptionUpdate(BaseModel):
    """Schema for updating prescription"""
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    duration_days: Optional[int] = None
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    status: Optional[str] = None


class PrescriptionResponse(PrescriptionBase):
    """Schema for prescription response"""
    id: UUID
    patient_id: UUID
    visit_id: UUID
    prescribed_by_id: UUID
    prescribed_by_name: Optional[str] = None
    status: str
    dispensed_at: Optional[datetime] = None
    dispensed_by_id: Optional[UUID] = None
    dispensed_by_name: Optional[str] = None
    administered_at: Optional[datetime] = None
    administered_by_id: Optional[UUID] = None
    administered_by_name: Optional[str] = None
    # Medication administration acknowledgment fields
    administration_notes: Optional[str] = None
    administration_confirmed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrescriptionAdminister(BaseModel):
    """Schema for administering medication with nurse acknowledgment"""
    administration_notes: Optional[str] = Field(None, max_length=500)
    administration_confirmed: bool = True
