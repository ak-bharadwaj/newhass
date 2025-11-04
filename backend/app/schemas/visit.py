"""Pydantic schemas for Visit resources"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class VisitBase(BaseModel):
    """Base visit schema"""
    visit_type: str = Field(..., description="inpatient, outpatient, emergency")
    reason_for_visit: str = Field(..., min_length=1)
    diagnosis: Optional[str] = None


class VisitCreate(VisitBase):
    """Schema for creating visit"""
    patient_id: UUID
    hospital_id: UUID
    attending_doctor_id: Optional[UUID] = None


class VisitUpdate(BaseModel):
    """Schema for updating visit"""
    attending_doctor_id: Optional[UUID] = None
    diagnosis: Optional[str] = None
    status: Optional[str] = None


class VisitResponse(VisitBase):
    """Schema for visit response"""
    id: UUID
    patient_id: UUID
    hospital_id: UUID
    attending_doctor_id: Optional[UUID] = None
    attending_doctor_name: Optional[str] = None
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    discharge_summary: Optional[str] = None
    is_synced_to_global: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VisitNoteCreate(BaseModel):
    """Schema for adding clinical note to visit"""
    content: str = Field(..., min_length=1)
    note_type: str = Field(default="progress_note", description="progress_note, admission_note, discharge_note")


class VisitDischarge(BaseModel):
    """Schema for initiating discharge"""
    discharge_summary: str = Field(..., min_length=1)
    discharge_diagnosis: Optional[str] = None


class PaginatedVisits(BaseModel):
    """Paginated visits response"""
    visits: List[VisitResponse]
    total: int
    page: int
    page_size: int
