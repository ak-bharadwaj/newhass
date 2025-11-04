"""Global patient search Pydantic schemas"""
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import date


class GlobalPatientSearchRequest(BaseModel):
    """Schema for global patient search request"""
    search_query: str = Field(..., min_length=2, max_length=200)
    search_by: str = Field(
        default="auto",
        pattern="^(auto|national_id|phone|email|name|mrn)$"
    )


class GlobalPatientSearchResponse(BaseModel):
    """Schema for global patient search response"""
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    phone: Optional[str]
    email: Optional[str]
    national_id: Optional[str]
    passport_number: Optional[str]
    blood_group: Optional[str]
    allergies: Optional[str]
    hospitals: List[Dict[str, str]]  # List of {hospital_id, local_mrn, hospital_name}
    is_active: bool

    class Config:
        from_attributes = True


class PatientHospitalCreate(BaseModel):
    """Schema for creating patient-hospital link"""
    patient_id: UUID
    hospital_id: UUID
    local_mrn: str = Field(..., max_length=50)


class NurseAcknowledgment(BaseModel):
    """Schema for nurse acknowledgment of vitals or medications"""
    notes: Optional[str] = Field(None, max_length=500)


class VitalsAcknowledgment(NurseAcknowledgment):
    """Schema for nurse acknowledgment of vitals"""
    pass


class MedicationAdministration(NurseAcknowledgment):
    """Schema for medication administration acknowledgment"""
    administration_notes: Optional[str] = Field(None, max_length=500)
    administration_confirmed: bool = True
