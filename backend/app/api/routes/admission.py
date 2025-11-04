"""Patient admission API routes with first-visit workflow"""
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.models.user import User
from app.services.admission_service import AdmissionService
from app.services.discharge_sync_service import DischargeSyncService

router = APIRouter()


class PatientAdmissionRequest(BaseModel):
    """Schema for patient admission request"""
    # Patient identification (for finding existing)
    national_id: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    # Patient demographics (required for new patients)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., pattern="^(male|female|other|prefer_not_to_say)$")
    blood_group: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    allergies: Optional[str] = None
    passport_number: Optional[str] = Field(None, max_length=50)
    # Hospital and visit details
    hospital_id: UUID
    local_mrn: str = Field(..., min_length=1, max_length=50, description="Hospital-specific MRN")
    reason_for_visit: str = Field(..., min_length=1)
    visit_type: str = Field(..., pattern="^(inpatient|outpatient|emergency)$")
    attending_doctor_id: Optional[UUID] = None
    # For outpatient: appointment scheduling
    appointment_time: Optional[datetime] = Field(None, description="Preferred appointment time for outpatient visits")


class DischargeRequest(BaseModel):
    """Schema for patient discharge request"""
    discharge_summary: Optional[str] = None
    diagnosis: Optional[str] = None
    follow_up_instructions: Optional[str] = None


@router.post("/admit", response_model=dict)
def admit_patient(
    admission_data: PatientAdmissionRequest,
    current_user: User = Depends(require_role("manager", "super_admin")),
    db: Session = Depends(get_db),
):
    """
    Admit patient with first-visit workflow.

    Visit Types & Priority:
    - EMERGENCY (Priority 1): Highest priority, auto-creates case sheet, immediate attention
    - INPATIENT (Priority 2): High priority, auto-creates case sheet, scheduled care
    - OUTPATIENT (Priority 3): Normal priority, schedule appointment to reduce wait time

    Workflow:
    1. Check if patient exists globally (by national_id, phone, or email)
    2. If exists: Link to hospital with local MRN
    3. If new: Create global patient record (admin/manager only)
    4. Create patient-hospital link
    5. Create visit record with priority
    6. If INPATIENT or EMERGENCY: Auto-create case sheet
    7. If OUTPATIENT: Suggest appointment scheduling

    Permission: Manager, Admin only

    IMPORTANT: Only admin/manager can create new global patient IDs.
    This ensures patient data integrity across the system.
    """
    admission_service = AdmissionService(db)

    return admission_service.admit_patient(
        national_id=admission_data.national_id,
        phone=admission_data.phone,
        email=admission_data.email,
        first_name=admission_data.first_name,
        last_name=admission_data.last_name,
        date_of_birth=admission_data.date_of_birth,
        gender=admission_data.gender,
        blood_group=admission_data.blood_group,
        address=admission_data.address,
        emergency_contact_name=admission_data.emergency_contact_name,
        emergency_contact_phone=admission_data.emergency_contact_phone,
        allergies=admission_data.allergies,
        passport_number=admission_data.passport_number,
        hospital_id=admission_data.hospital_id,
        local_mrn=admission_data.local_mrn,
        reason_for_visit=admission_data.reason_for_visit,
        visit_type=admission_data.visit_type,
        attending_doctor_id=admission_data.attending_doctor_id,
        appointment_time=admission_data.appointment_time,
        admitted_by_user=current_user
    )


@router.get("/admission-summary/{visit_id}", response_model=dict)
def get_admission_summary(
    visit_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get admission summary for a visit.

    Returns patient info, local MRN, admission details.

    Permission: All authenticated users
    """
    admission_service = AdmissionService(db)
    summary = admission_service.get_admission_summary(visit_id)

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    return summary


@router.post("/discharge/{visit_id}", response_model=dict)
def discharge_patient(
    visit_id: UUID,
    discharge_data: DischargeRequest,
    current_user: User = Depends(require_role("doctor", "manager")),
    db: Session = Depends(get_db),
):
    """
    Discharge patient and trigger auto-sync to global database.

    Workflow:
    1. Update visit with discharge details
    2. Mark visit as discharged
    3. Auto-sync important fields to global patient record
    4. Return discharge summary

    Permission: Doctor, Manager only

    IMPORTANT: This triggers automatic sync of local hospital data
    to the global patient database, updating allergies and other
    critical information.
    """
    from app.models.visit import Visit
    from datetime import datetime

    # Get visit
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    # Check if already discharged
    if visit.status == "discharged":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient already discharged"
        )

    # Update visit
    visit.discharge_date = datetime.utcnow()
    visit.discharge_summary = discharge_data.discharge_summary
    visit.diagnosis = discharge_data.diagnosis
    visit.status = "discharged"
    visit.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(visit)

    # Trigger auto-sync to global database
    sync_service = DischargeSyncService(db)
    sync_result = sync_service.sync_on_discharge(visit_id)

    return {
        "success": True,
        "message": "Patient discharged successfully",
        "visit": {
            "id": str(visit.id),
            "patient_id": str(visit.patient_id),
            "discharge_date": visit.discharge_date,
            "status": visit.status
        },
        "sync_result": sync_result
    }


@router.get("/sync-status/{visit_id}", response_model=dict)
def get_sync_status(
    visit_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get sync status for a visit.

    Shows whether visit data has been synced to global database.

    Permission: All authenticated users
    """
    sync_service = DischargeSyncService(db)
    return sync_service.get_sync_status(visit_id)


@router.get("/visit-summary/{visit_id}", response_model=dict)
def get_visit_summary(
    visit_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive visit summary.

    Includes case sheet, vitals, prescriptions, lab tests counts.

    Permission: All authenticated users
    """
    sync_service = DischargeSyncService(db)
    summary = sync_service.get_visit_summary(visit_id)

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    return summary
