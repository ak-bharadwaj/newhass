from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class BedBase(BaseModel):
    bed_number: str = Field(..., min_length=1, max_length=20, description="Bed number/identifier")
    ward: str = Field(..., min_length=1, max_length=100, description="Ward name (e.g., ICU, General Ward)")
    floor: Optional[str] = Field(None, max_length=20, description="Floor number or name")
    bed_type: str = Field(..., description="Bed type: standard, icu, isolation")


class BedCreate(BedBase):
    hospital_id: UUID


class BedUpdate(BaseModel):
    bed_number: Optional[str] = Field(None, min_length=1, max_length=20)
    ward: Optional[str] = Field(None, min_length=1, max_length=100)
    floor: Optional[str] = Field(None, max_length=20)
    bed_type: Optional[str] = None
    is_active: Optional[bool] = None


class BedAssign(BaseModel):
    patient_id: UUID
    visit_id: UUID


class BedRelease(BaseModel):
    pass  # No additional data needed


class BedResponse(BedBase):
    id: UUID
    hospital_id: UUID
    hospital_name: Optional[str] = None
    status: str  # available, occupied, maintenance, reserved
    assigned_patient_id: Optional[UUID] = None
    assigned_patient_name: Optional[str] = None
    assigned_patient_mrn: Optional[str] = None
    assigned_visit_id: Optional[UUID] = None
    assigned_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
