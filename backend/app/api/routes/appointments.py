"""Appointment scheduling API routes"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.services.appointment_service import AppointmentService
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentCheckIn,
    AppointmentCancel,
    AppointmentResponse,
    AppointmentSlot,
)


router = APIRouter()


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reception", "manager", "patient")),
):
    """Create a new appointment (reception, manager, patient)"""
    service = AppointmentService(db)
    return service.create_appointment(appointment_data, current_user.id)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get appointment by ID"""
    service = AppointmentService(db)
    return service.get_appointment(appointment_id)


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    hospital_id: Optional[UUID] = Query(None, description="Filter by hospital"),
    doctor_id: Optional[UUID] = Query(None, description="Filter by doctor"),
    patient_id: Optional[UUID] = Query(None, description="Filter by patient"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get appointments with filters"""
    service = AppointmentService(db)

    # If user is a patient, only show their appointments
    if current_user.role.name == "patient":
        patient_id = current_user.id  # Assuming patient user maps to patient record

    return service.get_appointments(
        hospital_id=hospital_id,
        doctor_id=doctor_id,
        patient_id=patient_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: UUID,
    appointment_update: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reception", "manager", "doctor")),
):
    """Update appointment (reception, manager, doctor)"""
    service = AppointmentService(db)
    return service.update_appointment(appointment_id, appointment_update)


@router.post("/{appointment_id}/check-in", response_model=AppointmentResponse)
def check_in_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reception", "manager")),
):
    """Check in patient for appointment (reception, manager)"""
    service = AppointmentService(db)
    return service.check_in(appointment_id)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: UUID,
    cancel_data: AppointmentCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reception", "manager", "patient", "doctor")),
):
    """Cancel appointment (reception, manager, patient, doctor)"""
    service = AppointmentService(db)
    return service.cancel_appointment(appointment_id, cancel_data)


@router.get("/slots/available", response_model=List[AppointmentSlot])
def get_available_slots(
    doctor_id: UUID = Query(..., description="Doctor ID"),
    date: datetime = Query(..., description="Date to check availability"),
    duration_minutes: int = Query(30, ge=15, le=120, description="Appointment duration in minutes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available appointment slots for a doctor on a specific date"""
    service = AppointmentService(db)
    return service.get_available_slots(doctor_id, date, duration_minutes)
