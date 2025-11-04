"""QR Code API routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.qr_service import QRService


router = APIRouter()


class GenerateQRRequest(BaseModel):
    """Request to generate QR code"""
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    expires_in_hours: int = 24


class ValidateQRRequest(BaseModel):
    """Request to validate QR code"""
    qr_data: str


@router.post("/generate/patient-checkin")
def generate_patient_checkin_qr(
    request: GenerateQRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate QR code for patient check-in

    Permissions: manager, reception, super_admin
    """
    if current_user.role.name not in ["manager", "reception", "super_admin", "regional_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate QR codes"
        )

    qr_service = QRService(db)

    try:
        result = qr_service.generate_patient_checkin_qr(
            patient_id=request.patient_id,
            appointment_id=request.appointment_id,
            expires_in_hours=request.expires_in_hours
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/generate/appointment")
def generate_appointment_qr(
    appointment_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate QR code for appointment

    Permissions: manager, reception, doctor, super_admin
    """
    if current_user.role.name not in ["manager", "reception", "doctor", "super_admin", "regional_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate QR codes"
        )

    qr_service = QRService(db)

    try:
        result = qr_service.generate_appointment_qr(appointment_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/validate/checkin")
def validate_checkin_qr(
    request: ValidateQRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Validate scanned QR code for check-in

    Permissions: manager, reception, nurse, super_admin
    """
    if current_user.role.name not in ["manager", "reception", "nurse", "super_admin", "regional_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to validate QR codes"
        )

    qr_service = QRService(db)
    result = qr_service.validate_checkin_qr(request.qr_data)

    if not result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Invalid QR code")
        )

    return result
