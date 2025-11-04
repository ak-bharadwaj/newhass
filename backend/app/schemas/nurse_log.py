"""Pydantic schemas for Nurse Log resources"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class NurseLogBase(BaseModel):
    """Base nurse log schema"""
    log_type: str = Field(..., description="observation, care_activity, incident, note, handoff")
    content: str = Field(..., min_length=1)
    logged_at: Optional[datetime] = None


class NurseLogCreate(NurseLogBase):
    """Schema for creating nurse log"""
    patient_id: UUID
    visit_id: UUID


class NurseLogResponse(NurseLogBase):
    """Schema for nurse log response"""
    id: UUID
    patient_id: UUID
    visit_id: UUID
    nurse_id: UUID
    nurse_name: Optional[str] = None
    logged_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedNurseLogs(BaseModel):
    """Paginated nurse logs response"""
    logs: List[NurseLogResponse]
    total: int
    page: int
    page_size: int
