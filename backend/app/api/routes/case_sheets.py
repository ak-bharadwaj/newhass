"""Proxy module for case sheet routes.

This module intentionally re-exports the clean implementation from
`case_sheets_clean.py` to avoid prior corruption issues. Keep all
route logic in that module; import its `router` here for compatibility.
"""

from .case_sheets_clean import router
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.models.user import User
from app.models.case_sheet import CaseSheet
from app.models.visit import Visit
from app.schemas.case_sheet import (
    CaseSheetCreate,
    CaseSheetUpdate,
    CaseSheetResponse,
    AddProgressNote,
    AddEventToTimeline,
    AcknowledgeEvent,
    EventType
)

router = APIRouter()


@router.post("", response_model=CaseSheetResponse, status_code=status.HTTP_201_CREATED)
def create_case_sheet(
    case_sheet_data: CaseSheetCreate,
    current_user: User = Depends(require_role("doctor", "manager")),
    db: Session = Depends(get_db),
):
    """
    Create a comprehensive case sheet for patient visit.

    IMPORTANT: Case sheets are ONLY for INPATIENT visits.
    For outpatient or emergency visits, use visit notes instead.

    Permission: Doctor, Manager only
    """
    # Verify visit exists
    visit = db.query(Visit).filter(Visit.id == case_sheet_data.visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )
    
    # CRITICAL: Case sheets only for inpatient visits
    if visit.visit_type != "inpatient":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Case sheets are only for inpatient visits. This is a {visit.visit_type} visit."
        )

    # Check for duplicate case number in same hospital
    existing = db.query(CaseSheet).filter(
        CaseSheet.hospital_id == case_sheet_data.hospital_id,
        CaseSheet.case_number == case_sheet_data.case_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Case number {case_sheet_data.case_number} already exists in this hospital"
        )

    # Create case sheet
    case_sheet = CaseSheet(
        patient_id=case_sheet_data.patient_id,
        visit_id=case_sheet_data.visit_id,
        hospital_id=case_sheet_data.hospital_id,
        case_number=case_sheet_data.case_number,
        admission_date=case_sheet_data.admission_date,
        discharge_date=case_sheet_data.discharge_date,
        chief_complaint=case_sheet_data.chief_complaint,
        present_illness=case_sheet_data.present_illness,
        past_medical_history=case_sheet_data.past_medical_history,
        family_history=case_sheet_data.family_history,
        physical_examination=case_sheet_data.physical_examination,
        diagnosis=case_sheet_data.diagnosis,
        treatment_plan=case_sheet_data.treatment_plan,
        discharge_summary=case_sheet_data.discharge_summary,
        follow_up_instructions=case_sheet_data.follow_up_instructions,
        progress_notes=[],
        event_timeline=[],  # Initialize empty event timeline
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(case_sheet)
    db.commit()
    db.refresh(case_sheet)

    return case_sheet


@router.get("", response_model=List[CaseSheetResponse])
def list_case_sheets(
    patient_id: Optional[UUID] = Query(None),
    visit_id: Optional[UUID] = Query(None),
    hospital_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List case sheets with filters.

    Permission: All authenticated users (role-based filtering applies)
    Viewable by: Admin, Doctor, Nurse, Manager
    """
    # Check if user can view case sheets
    if not CaseSheet.can_view(None, current_user.role.name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view case sheets"
        )

    query = db.query(CaseSheet)

    # Apply filters
    if patient_id:
        query = query.filter(CaseSheet.patient_id == patient_id)

    if visit_id:
        query = query.filter(CaseSheet.visit_id == visit_id)

    if hospital_id:
        query = query.filter(CaseSheet.hospital_id == hospital_id)
    elif current_user.hospital_id:
        # Restrict to user's hospital if not super_admin
        if current_user.role.name not in ["super_admin", "regional_admin"]:
            query = query.filter(CaseSheet.hospital_id == current_user.hospital_id)

    # Pagination
    offset = (page - 1) * page_size
    case_sheets = query.order_by(CaseSheet.admission_date.desc()).offset(offset).limit(page_size).all()

    return case_sheets


@router.get("/{case_sheet_id}", response_model=CaseSheetResponse)
def get_case_sheet(
    case_sheet_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get specific case sheet by ID.

    Permission: Admin, Doctor, Nurse, Manager
    """
    # Check if user can view case sheets
    if not CaseSheet.can_view(None, current_user.role.name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view case sheets"
        )

    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to case sheets from other hospitals"
            )

    return case_sheet


@router.patch("/{case_sheet_id}", response_model=CaseSheetResponse)
def update_case_sheet(
    case_sheet_id: UUID,
    updates: CaseSheetUpdate,
    current_user: User = Depends(require_role("doctor", "manager")),
    db: Session = Depends(get_db),
):
    """
    Update case sheet.

    Permission: Doctor, Manager only
    """
    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit case sheets from your hospital"
            )

    # Update fields
    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case_sheet, field, value)

    case_sheet.last_updated_by = current_user.id
    case_sheet.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case_sheet)

    return case_sheet


@router.post("/{case_sheet_id}/progress-note", response_model=CaseSheetResponse)
def add_progress_note(
    case_sheet_id: UUID,
    note_data: AddProgressNote,
    current_user: User = Depends(require_role("doctor", "nurse", "manager")),
    db: Session = Depends(get_db),
):
    """
    Add progress note to case sheet.

    Permission: Doctor, Nurse, Manager
    """
    case_sheet = db.query(CaseSheet).filter(CaseSheet.id == case_sheet_id).first()

    if not case_sheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case sheet not found"
        )

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add notes to case sheets from your hospital"
            )

    # Add progress note
    if not case_sheet.progress_notes:
        case_sheet.progress_notes = []

    case_sheet.progress_notes.append({
        "date": datetime.utcnow().isoformat(),
        "note": note_data.note,
        "by_user_id": str(current_user.id),
        "by_user_name": f"{current_user.first_name} {current_user.last_name}",
        "by_user_role": current_user.role.name
    })

    case_sheet.last_updated_by = current_user.id
    case_sheet.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case_sheet)

    return case_sheet


@router.get("/by-patient/{patient_id}", response_model=List[CaseSheetResponse])
def get_patient_case_sheets(
    patient_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all case sheets for a specific patient.

    Permission: All authenticated users with view access
    Returns case sheets ordered by admission date (most recent first).
    """
    # Check if user can view case sheets
    if not CaseSheet.can_view(None, current_user.role.name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view case sheets"
        )

    query = db.query(CaseSheet).filter(CaseSheet.patient_id == patient_id)

    # Filter by hospital if user is not admin
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        query = query.filter(CaseSheet.hospital_id == current_user.hospital_id)

    case_sheets = query.order_by(CaseSheet.admission_date.desc()).all()

    return case_sheets


@router.get("/by-visit/{visit_id}", response_model=Optional[CaseSheetResponse])
def get_visit_case_sheet(
    visit_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get case sheet for specific visit.

    Permission: All authenticated users with view access
    """
    # Check if user can view case sheets
    if not CaseSheet.can_view(None, current_user.role.name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view case sheets"
        )

    case_sheet = db.query(CaseSheet).filter(CaseSheet.visit_id == visit_id).first()

    if not case_sheet:
        return None

    # Check hospital access
    if current_user.hospital_id and current_user.role.name not in ["super_admin", "regional_admin"]:
        if case_sheet.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to case sheets from other hospitals"
            )

    return case_sheet

 
 