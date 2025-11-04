"""Clinical API routes for vitals, prescriptions, nurse logs, lab tests"""
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.services.clinical_service import ClinicalService
from app.services.prescription_assistant import PrescriptionAssistant
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionAdminister
from app.schemas.nurse_log import NurseLogCreate, NurseLogResponse
from app.schemas.lab_test import LabTestCreate, LabTestResponse
from app.models.user import User

router = APIRouter()


def get_clinical_service(db: Session = Depends(get_db)) -> ClinicalService:
    """Get clinical service instance"""
    return ClinicalService(db)


def get_prescription_assistant(db: Session = Depends(get_db)) -> PrescriptionAssistant:
    """Get prescription assistant instance"""
    return PrescriptionAssistant(db)


# ========== Request/Response Models for AI Assistant ==========
class PrescriptionSuggestionRequest(BaseModel):
    patient_id: UUID
    chief_complaint: Optional[str] = None


class PrescriptionValidationRequest(BaseModel):
    patient_id: UUID
    medication_name: str
    dosage: str
    frequency: str
    route: str
    duration_days: Optional[int] = None


class VitalsAcknowledgeRequest(BaseModel):
    """Request model for nurse acknowledgment of vitals"""
    acknowledgment_notes: Optional[str] = None


# ========== Vitals Endpoints ==========
@router.post("/vitals", response_model=VitalsResponse)
def record_vitals(
    vitals_data: VitalsCreate,
    current_user: User = Depends(require_role("nurse", "doctor")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """Record vitals for a patient"""
    return clinical_service.record_vitals(vitals_data, current_user.id)


@router.post("/vitals/{vitals_id}/acknowledge", response_model=VitalsResponse)
def acknowledge_vitals(
    vitals_id: UUID,
    ack_data: VitalsAcknowledgeRequest,
    current_user: User = Depends(require_role("nurse")),
    db: Session = Depends(get_db),
):
    """
    Nurse acknowledges vitals they recorded/reviewed.
    
    This confirms the nurse has reviewed the vitals and they are accurate.
    Required by hospital policy for patient safety.
    
    Permission: Nurse only
    """
    from app.models.vitals import Vitals
    from datetime import datetime
    from app.services.case_sheet_logger import CaseSheetLogger
    
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vitals record not found"
        )
    
    # Update acknowledgment fields
    vitals.acknowledged_by = current_user.id
    vitals.acknowledged_at = datetime.utcnow()
    vitals.acknowledgment_notes = ack_data.acknowledgment_notes
    
    db.commit()
    db.refresh(vitals)
    
    # Auto-log to case sheet if inpatient
    logger = CaseSheetLogger(db)
    logger.log_vital_acknowledged(
        visit_id=vitals.visit_id,
        vital_id=vitals.id,
        acknowledged_by_id=current_user.id,
        acknowledgment_notes=ack_data.acknowledgment_notes
    )
    
    return vitals


# ========== Prescription Endpoints ==========
@router.post("/prescriptions", response_model=PrescriptionResponse)
def create_prescription(
    prescription_data: PrescriptionCreate,
    current_user: User = Depends(require_role("doctor")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """Create new prescription"""
    return clinical_service.create_prescription(prescription_data, current_user.id)


@router.post("/prescriptions/{prescription_id}/administer", response_model=PrescriptionResponse)
def administer_medication(
    prescription_id: UUID,
    admin_data: PrescriptionAdminister,
    current_user: User = Depends(require_role("nurse")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """
    Mark medication as administered with nurse acknowledgment.

    Nurse confirms they administered the medication to the patient
    as prescribed by the doctor. Includes confirmation flag and notes.

    Permission: Nurse only
    """
    return clinical_service.administer_medication(prescription_id, current_user.id, admin_data)


@router.post("/prescriptions/{prescription_id}/dispense", response_model=PrescriptionResponse)
def dispense_prescription(
    prescription_id: UUID,
    current_user: User = Depends(require_role("pharmacist")),
    db: Session = Depends(get_db),
):
    """
    Mark prescription as dispensed by pharmacist.

    Pharmacist confirms they have dispensed the medication to the patient
    or caregiver. This marks the prescription as fulfilled.

    Permission: Pharmacist only
    """
    from app.models.prescription import Prescription
    from datetime import datetime
    from fastapi import HTTPException, status as http_status

    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    # Update dispense fields
    prescription.dispensed_by_id = current_user.id
    prescription.dispensed_at = datetime.utcnow()
    prescription.status = "dispensed"

    db.commit()
    db.refresh(prescription)

    return prescription


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def list_prescriptions(
    hospital_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None, regex="^(active|pending|dispensed|administered|cancelled)$"),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(require_role("pharmacist", "doctor", "nurse")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """List prescriptions, optionally filtering by hospital and status"""
    return clinical_service.get_prescriptions(hospital_id=hospital_id, status_filter=status, limit=limit)


# ========== Nurse Log Endpoints ==========
@router.post("/nurse-logs", response_model=NurseLogResponse)
def create_nurse_log(
    log_data: NurseLogCreate,
    current_user: User = Depends(require_role("nurse")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """Create nurse log entry"""
    return clinical_service.create_nurse_log(log_data, current_user.id)


# ========== Lab Test Endpoints ==========
@router.post("/lab-tests", response_model=LabTestResponse)
def create_lab_test(
    test_data: LabTestCreate,
    current_user: User = Depends(require_role("doctor")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """Create lab test request"""
    return clinical_service.create_lab_test(test_data, current_user.id)


@router.get("/lab-tests", response_model=List[LabTestResponse])
def list_lab_tests(
    hospital_id: Optional[UUID] = Query(None),
    patient_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    assigned_to_id: Optional[UUID] = Query(None),
    requested_by_id: Optional[UUID] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    current_user: User = Depends(require_role("lab_tech", "doctor", "nurse")),
    clinical_service: ClinicalService = Depends(get_clinical_service),
):
    """List lab tests with optional filters (lab tech / doctor / nurse)"""
    return clinical_service.list_lab_tests(
        hospital_id=hospital_id,
        patient_id=patient_id,
        status=status,
        urgency=urgency,
        assigned_to_id=assigned_to_id,
        requested_by_id=requested_by_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


class LabTestStatusUpdate(BaseModel):
    """Request model for updating lab test status"""
    status: str  # "pending", "in_progress", "completed", "cancelled"


class LabTestResultsUpload(BaseModel):
    """Request model for uploading lab test results"""
    results: str
    notes: Optional[str] = None


@router.patch("/lab-tests/{test_id}/status", response_model=LabTestResponse)
def update_lab_test_status(
    test_id: UUID,
    status_update: LabTestStatusUpdate,
    current_user: User = Depends(require_role("lab_tech")),
    db: Session = Depends(get_db),
):
    """
    Update lab test status

    Lab tech can update status to:
    - "in_progress" when accepting a test
    - "completed" when finishing a test
    - "cancelled" if test cannot be performed

    Permission: Lab Tech only
    """
    from app.models.lab_test import LabTest
    from datetime import datetime
    from fastapi import HTTPException, status as http_status

    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Lab test not found"
        )

    # Validate status transition
    valid_statuses = ["pending", "in_progress", "completed", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Update status
    test.status = status_update.status

    # Set timestamps based on status
    if status_update.status == "in_progress":
        test.accepted_at = datetime.utcnow()
        test.assigned_to_id = current_user.id
    elif status_update.status == "completed":
        test.completed_at = datetime.utcnow()
        if not test.assigned_to_id:
            test.assigned_to_id = current_user.id

    db.commit()
    db.refresh(test)

    return test


@router.post("/lab-tests/{test_id}/results", response_model=LabTestResponse)
def upload_lab_test_results(
    test_id: UUID,
    results_data: LabTestResultsUpload,
    current_user: User = Depends(require_role("lab_tech")),
    db: Session = Depends(get_db),
):
    """
    Upload lab test results (text-based)

    Lab tech uploads the test results summary and any additional notes.
    This automatically marks the test as completed.

    Permission: Lab Tech only
    """
    from app.models.lab_test import LabTest
    from datetime import datetime
    from fastapi import HTTPException, status as http_status

    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Lab test not found"
        )

    # Verify test is assigned or in progress
    if test.status == "pending":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Test must be accepted before uploading results"
        )

    # Update results
    test.result_summary = results_data.results
    if results_data.notes:
        test.notes = results_data.notes

    # Mark as completed
    test.status = "completed"
    test.completed_at = datetime.utcnow()

    # Ensure assigned_to is set
    if not test.assigned_to_id:
        test.assigned_to_id = current_user.id

    db.commit()
    db.refresh(test)

    return test


# ========== AI Prescription Assistant Endpoints ==========
@router.post("/prescriptions/ai/suggest")
def suggest_prescriptions(
    request: PrescriptionSuggestionRequest,
    current_user: User = Depends(require_role("doctor")),
    assistant: PrescriptionAssistant = Depends(get_prescription_assistant),
):
    """
    AI-powered prescription suggestions BEFORE writing prescription
    Based on patient's medical conditions, allergies, and current complaint
    
    Returns medication suggestions with rationale
    """
    return assistant.suggest_prescriptions(
        patient_id=request.patient_id,
        chief_complaint=request.chief_complaint
    )


@router.post("/prescriptions/ai/validate")
def validate_prescription(
    request: PrescriptionValidationRequest,
    current_user: User = Depends(require_role("doctor")),
    assistant: PrescriptionAssistant = Depends(get_prescription_assistant),
):
    """
    AI-powered prescription validation AFTER writing prescription
    Validates appropriateness and suggests alternatives if better options exist
    
    Returns validation result with alternatives and warnings
    """
    return assistant.validate_prescription(
        patient_id=request.patient_id,
        medication_name=request.medication_name,
        dosage=request.dosage,
        frequency=request.frequency,
        route=request.route,
        duration_days=request.duration_days
    )
