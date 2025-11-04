from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class AppointmentBase(BaseModel):
    scheduled_at: datetime = Field(..., description="Appointment date and time")
    duration_minutes: int = Field(default=30, ge=5, le=480, description="Duration in minutes")
    appointment_type: str = Field(..., min_length=1, max_length=100, description="Type: consultation, follow-up, procedure")
    reason: Optional[str] = Field(None, description="Reason for appointment")
    notes: Optional[str] = Field(None, description="Additional notes")


class AppointmentCreate(AppointmentBase):
    patient_id: UUID
    doctor_id: UUID
    hospital_id: UUID


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    appointment_type: Optional[str] = Field(None, min_length=1, max_length=100)
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AppointmentCheckIn(BaseModel):
    pass  # No additional data needed


class AppointmentCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=1, description="Reason for cancellation")


class AppointmentResponse(AppointmentBase):
    id: UUID
    patient_id: UUID
    patient_name: str
    patient_mrn: str
    patient_phone: Optional[str] = None
    doctor_id: UUID
    doctor_name: str
    doctor_profile_picture_url: Optional[str] = None
    doctor_qualification: Optional[str] = None
    hospital_id: UUID
    hospital_name: str
    status: str  # scheduled, checked_in, in_progress, completed, cancelled, no_show
    checked_in_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_by_id: UUID
    created_by_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentSlot(BaseModel):
    """Available time slot for appointments"""
    start_time: datetime
    end_time: datetime
    is_available: bool
    doctor_id: UUID
    doctor_name: str
