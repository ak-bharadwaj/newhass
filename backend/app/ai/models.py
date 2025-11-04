"""
Pydantic models for AI request/response schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# Risk Score Models
class RiskScoreResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
    factors: List[str]
    recommendations: List[str]


# Discharge Summary Models
class DischargeSummaryResponse(BaseModel):
    summary: str
    diagnoses: List[str]
    procedures: List[str]
    medications: List[str]
    follow_up: str


# Treatment Plan Models
class TreatmentOption(BaseModel):
    option: str
    details: str
    evidence: str


class TreatmentPlanRequest(BaseModel):
    patient_id: UUID
    symptoms: str


class TreatmentPlanResponse(BaseModel):
    primary_diagnosis: str
    differential_diagnoses: List[str]
    recommended_tests: List[str]
    treatment_options: List[TreatmentOption]
    precautions: List[str]


# Vitals Anomaly Models
class VitalsAnomalyResponse(BaseModel):
    is_anomalous: bool
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    anomalies: List[str]
    recommended_actions: List[str]


# AI Draft Models
class AIDraftCreate(BaseModel):
    patient_id: UUID
    visit_id: Optional[UUID] = None
    draft_type: str = Field(..., pattern="^(risk_score|discharge_summary|treatment_plan|anomaly_alert)$")
    content: Dict[str, Any]
    created_by_system: bool = True


class AIDraftUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|approved|rejected|expired)$")
    approval_notes: Optional[str] = None


class AIDraftResponse(BaseModel):
    id: UUID
    patient_id: UUID
    visit_id: Optional[UUID]
    draft_type: str
    content: Dict[str, Any]
    status: str
    created_by_system: bool
    reviewed_by_id: Optional[UUID]
    reviewed_at: Optional[datetime]
    approval_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
