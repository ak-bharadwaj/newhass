"""Hospital API routes"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.hospital_service import HospitalService
from app.schemas.hospital import (
    HospitalCreate,
    HospitalUpdate,
    HospitalResponse,
    HospitalWithStats,
)
from app.models.user import User

router = APIRouter()


def get_hospital_service(db: Session = Depends(get_db)) -> HospitalService:
    """Get hospital service instance"""
    return HospitalService(db)


@router.get("", response_model=List[HospitalWithStats])
def get_all_hospitals(
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    hospital_service: HospitalService = Depends(get_hospital_service),
):
    """Get all hospitals with statistics"""
    return hospital_service.get_all_hospitals()


@router.post("", response_model=HospitalResponse)
def create_hospital(
    hospital_data: HospitalCreate,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    hospital_service: HospitalService = Depends(get_hospital_service),
):
    """Create a new hospital"""
    return hospital_service.create_hospital(hospital_data)


@router.get("/{hospital_id}", response_model=HospitalWithStats)
def get_hospital(
    hospital_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    hospital_service: HospitalService = Depends(get_hospital_service),
):
    """Get a single hospital with statistics"""
    return hospital_service.get_hospital(hospital_id)


@router.patch("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(
    hospital_id: UUID,
    hospital_data: HospitalUpdate,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    hospital_service: HospitalService = Depends(get_hospital_service),
):
    """Update a hospital"""
    return hospital_service.update_hospital(hospital_id, hospital_data)
