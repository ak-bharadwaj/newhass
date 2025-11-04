"""Case sheet Pydantic schemas"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class EventType(str, Enum):
    """Types of events in case sheet timeline"""
    VITALS_RECORDED = "vitals_recorded"
    MEDICATION_ADMINISTERED = "medication_administered"
    DOCTOR_VISIT = "doctor_visit"
    PROCEDURE = "procedure"
    LAB_TEST_ORDERED = "lab_test_ordered"
    LAB_RESULT_RECEIVED = "lab_result_received"
    IMAGING_ORDERED = "imaging_ordered"
    IMAGING_RESULT_RECEIVED = "imaging_result_received"
    CONSULTATION_REQUESTED = "consultation_requested"
    TRANSFER = "transfer"
    DISCHARGE_PLANNED = "discharge_planned"
    OTHER = "other"


class AddEventToTimeline(BaseModel):
    """Schema for adding an event to case sheet timeline"""
    event_type: EventType
    description: str = Field(..., min_length=1, max_length=1000)
    event_data: Optional[Dict[str, Any]] = None  # Additional structured data
    requires_acknowledgment: bool = Field(default=False)


class AcknowledgeEvent(BaseModel):
    """Schema for acknowledging an event in timeline"""
    event_index: int = Field(..., ge=0)
    acknowledgment_notes: Optional[str] = Field(None, max_length=500)


class ProgressNote(BaseModel):
    """Progress note entry"""
    date: datetime
    note: str
    by_user_id: UUID


class CaseSheetCreate(BaseModel):
    """Schema for creating a comprehensive case sheet"""
    patient_id: UUID
    visit_id: UUID
    hospital_id: UUID
    case_number: str = Field(..., max_length=50)
    admission_date: datetime
    
    # === PRESENTING COMPLAINTS ===
    chief_complaint: str = Field(..., min_length=1)
    present_illness: Optional[str] = None
    duration_of_symptoms: Optional[str] = None
    
    # === PAST HISTORY ===
    past_medical_history: Optional[Dict[str, Any]] = None
    past_surgical_history: Optional[Dict[str, Any]] = None
    allergies: Optional[Dict[str, Any]] = None
    current_medications: Optional[Dict[str, Any]] = None
    
    # === FAMILY & SOCIAL HISTORY ===
    family_history: Optional[str] = None
    social_history: Optional[Dict[str, Any]] = None
    
    # === GENERAL EXAMINATION ===
    general_appearance: Optional[str] = None
    vital_signs_on_admission: Optional[Dict[str, Any]] = None
    
    # === SYSTEMIC EXAMINATION ===
    cardiovascular_system: Optional[str] = None
    respiratory_system: Optional[str] = None
    gastrointestinal_system: Optional[str] = None
    central_nervous_system: Optional[str] = None
    musculoskeletal_system: Optional[str] = None
    other_systems: Optional[Dict[str, Any]] = None
    
    # === DIAGNOSIS ===
    provisional_diagnosis: Optional[str] = None
    differential_diagnosis: Optional[Dict[str, Any]] = None
    final_diagnosis: Optional[str] = None
    
    # === INVESTIGATIONS ===
    lab_investigations: Optional[Dict[str, Any]] = None
    imaging_studies: Optional[Dict[str, Any]] = None
    special_investigations: Optional[Dict[str, Any]] = None
    
    # === TREATMENT & MANAGEMENT ===
    treatment_plan: Optional[str] = None
    medications_prescribed: Optional[Dict[str, Any]] = None
    procedures_performed: Optional[Dict[str, Any]] = None
    iv_fluids: Optional[Dict[str, Any]] = None
    diet_advice: Optional[str] = None
    
    # === CHARTS ===
    intake_output_chart: Optional[Dict[str, Any]] = None
    
    # === CONSULTATION & OPERATION ===
    consultation_notes: Optional[Dict[str, Any]] = None
    operation_notes: Optional[Dict[str, Any]] = None
    
    # === DISCHARGE ===
    discharge_date: Optional[datetime] = None
    condition_on_discharge: Optional[str] = None
    discharge_medications: Optional[Dict[str, Any]] = None
    discharge_advice: Optional[str] = None
    discharge_summary: Optional[str] = None
    follow_up_instructions: Optional[str] = None


class CaseSheetUpdate(BaseModel):
    """Schema for updating a comprehensive case sheet"""
    # === PRESENTING COMPLAINTS ===
    chief_complaint: Optional[str] = None
    present_illness: Optional[str] = None
    duration_of_symptoms: Optional[str] = None
    
    # === PAST HISTORY ===
    past_medical_history: Optional[Dict[str, Any]] = None
    past_surgical_history: Optional[Dict[str, Any]] = None
    allergies: Optional[Dict[str, Any]] = None
    current_medications: Optional[Dict[str, Any]] = None
    
    # === FAMILY & SOCIAL HISTORY ===
    family_history: Optional[str] = None
    social_history: Optional[Dict[str, Any]] = None
    
    # === GENERAL EXAMINATION ===
    general_appearance: Optional[str] = None
    vital_signs_on_admission: Optional[Dict[str, Any]] = None
    
    # === SYSTEMIC EXAMINATION ===
    cardiovascular_system: Optional[str] = None
    respiratory_system: Optional[str] = None
    gastrointestinal_system: Optional[str] = None
    central_nervous_system: Optional[str] = None
    musculoskeletal_system: Optional[str] = None
    other_systems: Optional[Dict[str, Any]] = None
    
    # === DIAGNOSIS ===
    provisional_diagnosis: Optional[str] = None
    differential_diagnosis: Optional[Dict[str, Any]] = None
    final_diagnosis: Optional[str] = None
    
    # === INVESTIGATIONS ===
    lab_investigations: Optional[Dict[str, Any]] = None
    imaging_studies: Optional[Dict[str, Any]] = None
    special_investigations: Optional[Dict[str, Any]] = None
    
    # === TREATMENT & MANAGEMENT ===
    treatment_plan: Optional[str] = None
    medications_prescribed: Optional[Dict[str, Any]] = None
    procedures_performed: Optional[Dict[str, Any]] = None
    iv_fluids: Optional[Dict[str, Any]] = None
    diet_advice: Optional[str] = None
    
    # === CHARTS ===
    intake_output_chart: Optional[Dict[str, Any]] = None
    
    # === CONSULTATION & OPERATION ===
    consultation_notes: Optional[Dict[str, Any]] = None
    operation_notes: Optional[Dict[str, Any]] = None
    
    # === DISCHARGE ===
    discharge_date: Optional[datetime] = None
    condition_on_discharge: Optional[str] = None
    discharge_medications: Optional[Dict[str, Any]] = None
    discharge_advice: Optional[str] = None
    discharge_summary: Optional[str] = None
    follow_up_instructions: Optional[str] = None


class AddProgressNote(BaseModel):
    """Schema for adding a progress note"""
    note: str = Field(..., min_length=1, max_length=5000)


class CaseSheetResponse(BaseModel):
    """Schema for comprehensive case sheet response"""
    id: UUID
    patient_id: UUID
    visit_id: UUID
    hospital_id: UUID
    case_number: str
    admission_date: datetime
    
    # === PRESENTING COMPLAINTS ===
    chief_complaint: str
    present_illness: Optional[str]
    duration_of_symptoms: Optional[str]
    
    # === PAST HISTORY ===
    past_medical_history: Optional[Dict[str, Any]]
    past_surgical_history: Optional[Dict[str, Any]]
    allergies: Optional[Dict[str, Any]]
    current_medications: Optional[Dict[str, Any]]
    
    # === FAMILY & SOCIAL HISTORY ===
    family_history: Optional[str]
    social_history: Optional[Dict[str, Any]]
    
    # === GENERAL EXAMINATION ===
    general_appearance: Optional[str]
    vital_signs_on_admission: Optional[Dict[str, Any]]
    
    # === SYSTEMIC EXAMINATION ===
    cardiovascular_system: Optional[str]
    respiratory_system: Optional[str]
    gastrointestinal_system: Optional[str]
    central_nervous_system: Optional[str]
    musculoskeletal_system: Optional[str]
    other_systems: Optional[Dict[str, Any]]
    
    # === DIAGNOSIS ===
    provisional_diagnosis: Optional[str]
    differential_diagnosis: Optional[Dict[str, Any]]
    final_diagnosis: Optional[str]
    
    # === INVESTIGATIONS ===
    lab_investigations: Optional[Dict[str, Any]]
    imaging_studies: Optional[Dict[str, Any]]
    special_investigations: Optional[Dict[str, Any]]
    
    # === TREATMENT & MANAGEMENT ===
    treatment_plan: Optional[str]
    medications_prescribed: Optional[Dict[str, Any]]
    procedures_performed: Optional[Dict[str, Any]]
    iv_fluids: Optional[Dict[str, Any]]
    diet_advice: Optional[str]
    
    # === DAILY PROGRESS ===
    progress_notes: Optional[List[Dict[str, Any]]]
    event_timeline: Optional[List[Dict[str, Any]]]
    
    # === CHARTS ===
    intake_output_chart: Optional[Dict[str, Any]]
    
    # === CONSULTATION & OPERATION ===
    consultation_notes: Optional[Dict[str, Any]]
    operation_notes: Optional[Dict[str, Any]]
    
    # === DISCHARGE ===
    discharge_date: Optional[datetime]
    condition_on_discharge: Optional[str]
    discharge_medications: Optional[Dict[str, Any]]
    discharge_advice: Optional[str]
    discharge_summary: Optional[str]
    follow_up_instructions: Optional[str]
    
    # === METADATA ===
    created_by: UUID
    last_updated_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
