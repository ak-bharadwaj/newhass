"""Pydantic schemas for Vitals resources"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from decimal import Decimal


class VitalsBase(BaseModel):
    """Base vitals schema"""
    temperature: Optional[Decimal] = Field(None, ge=30.0, le=45.0, description="Temperature in Celsius")
    heart_rate: Optional[int] = Field(None, ge=20, le=250, description="Heart rate in bpm")
    blood_pressure_systolic: Optional[int] = Field(None, ge=50, le=250, description="Systolic BP in mmHg")
    blood_pressure_diastolic: Optional[int] = Field(None, ge=30, le=150, description="Diastolic BP in mmHg")
    respiratory_rate: Optional[int] = Field(None, ge=5, le=60, description="Respiratory rate per minute")
    spo2: Optional[int] = Field(None, ge=0, le=100, description="Oxygen saturation percentage")
    weight: Optional[Decimal] = Field(None, ge=0, description="Weight in kg")
    height: Optional[Decimal] = Field(None, ge=0, description="Height in cm")
    bmi: Optional[Decimal] = Field(None, ge=0, description="BMI")
    notes: Optional[str] = None
    is_abnormal: bool = False


class VitalsCreate(VitalsBase):
    """Schema for creating vitals"""
    patient_id: UUID
    visit_id: UUID


class VitalsUpdate(BaseModel):
    """Schema for updating vitals"""
    temperature: Optional[Decimal] = None
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    weight: Optional[Decimal] = None
    height: Optional[Decimal] = None
    notes: Optional[str] = None
    is_abnormal: Optional[bool] = None


class VitalsResponse(VitalsBase):
    """Schema for vitals response"""
    id: UUID
    patient_id: UUID
    visit_id: UUID
    recorded_by_id: UUID
    recorded_by_name: Optional[str] = None
    recorded_at: datetime
    created_at: datetime
    # Nurse acknowledgment fields
    acknowledged_by: Optional[UUID] = None
    acknowledged_at: Optional[datetime] = None
    acknowledgment_notes: Optional[str] = None

    class Config:
        from_attributes = True


class VitalsAcknowledge(BaseModel):
    """Schema for nurse acknowledgment of vitals"""
    acknowledgment_notes: Optional[str] = Field(None, max_length=500)
