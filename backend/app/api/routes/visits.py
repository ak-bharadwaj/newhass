"""
Visit management API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.schemas.visit import VisitCreate, VisitUpdate, VisitResponse
from app.tasks.discharge import autosync_discharge

router = APIRouter()


@router.post("/", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(
    visit_data: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create new visit (admission)
    Requires manager, doctor, or admin role
    """
    # Check permission
    if current_user.role.name not in ["manager", "doctor", "super_admin", "regional_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers, doctors, and admins can create visits"
        )

    # Create visit
    visit = Visit(
        patient_id=visit_data.patient_id,
        hospital_id=visit_data.hospital_id,
        attending_doctor_id=visit_data.attending_doctor_id,
        visit_type=visit_data.visit_type,
        reason_for_visit=visit_data.reason_for_visit,
        diagnosis=visit_data.diagnosis,
        status="active"
    )

    db.add(visit)
    db.commit()
    db.refresh(visit)

    return visit


@router.get("/{visit_id}", response_model=VisitResponse)
def get_visit(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get visit by ID"""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    # Check permission (can view own visits or if staff)
    if current_user.role.name == "patient":
        # Patient can only view their own visits
        if visit.patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own visits"
            )

    return visit


@router.patch("/{visit_id}", response_model=VisitResponse)
def update_visit(
    visit_id: UUID,
    visit_data: VisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update visit information
    Requires doctor or admin role
    """
    if current_user.role.name not in ["doctor", "super_admin", "regional_admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors, managers, and admins can update visits"
        )

    visit = db.query(Visit).filter(Visit.id == visit_id).first()

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    # Update fields
    update_data = visit_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(visit, field, value)

    db.commit()
    db.refresh(visit)

    return visit


@router.post("/{visit_id}/discharge")
def discharge_patient(
    visit_id: UUID,
    discharge_summary: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Discharge patient and trigger auto-sync

    This endpoint:
    1. Marks visit as discharged
    2. Triggers Celery task to sync Local EMR → Global EMR
    3. Generates discharge PDF case-sheet
    4. Sends notifications to admins

    Requires doctor or admin role
    """
    # Check permission
    if current_user.role.name not in ["doctor", "super_admin", "regional_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors and admins can discharge patients"
        )

    visit = db.query(Visit).filter(Visit.id == visit_id).first()

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    if visit.status == "discharged":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient already discharged"
        )

    # Update visit status
    visit.status = "discharged"
    visit.discharge_date = datetime.utcnow()

    if discharge_summary:
        visit.discharge_summary = discharge_summary

    db.commit()
    db.refresh(visit)

    # Trigger async auto-sync task
    task = autosync_discharge.delay(str(visit_id))

    return {
        "message": "Discharge initiated successfully",
        "visit_id": str(visit_id),
        "patient_name": f"{visit.patient.first_name} {visit.patient.last_name}",
        "discharge_date": visit.discharge_date.isoformat(),
        "task_id": task.id,
        "status": "processing",
        "note": "EMR synchronization and PDF generation are being processed in background"
    }


@router.get("/patient/{patient_id}", response_model=List[VisitResponse])
def get_patient_visits(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all visits for a patient"""
    visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.admission_date.desc()).all()

    # Check permission
    if current_user.role.name == "patient":
        # Patient can only view their own visits
        if visits and visits[0].patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own visits"
            )

    return visits
