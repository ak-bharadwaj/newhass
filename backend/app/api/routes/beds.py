"""Bed management API routes"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.services.bed_service import BedService
from app.schemas.bed import BedCreate, BedUpdate, BedAssign, BedRelease, BedResponse


router = APIRouter()


@router.post("", response_model=BedResponse, status_code=status.HTTP_201_CREATED)
def create_bed(
    bed_data: BedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
):
    """Create a new bed (manager, regional admin, super admin)"""
    service = BedService(db)
    return service.create_bed(bed_data)


@router.get("/{bed_id}", response_model=BedResponse)
def get_bed(
    bed_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get bed by ID"""
    service = BedService(db)
    return service.get_bed(bed_id)


@router.get("", response_model=List[BedResponse])
def get_beds(
    hospital_id: UUID = Query(..., description="Hospital ID to filter beds"),
    status: Optional[str] = Query(None, description="Filter by status: available, occupied, maintenance, reserved"),
    ward: Optional[str] = Query(None, description="Filter by ward name"),
    bed_type: Optional[str] = Query(None, description="Filter by bed type: standard, icu, isolation"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all beds in a hospital with optional filters"""
    service = BedService(db)
    return service.get_hospital_beds(
        hospital_id=hospital_id,
        status=status,
        ward=ward,
        bed_type=bed_type,
        is_active=is_active,
    )


@router.patch("/{bed_id}", response_model=BedResponse)
def update_bed(
    bed_id: UUID,
    bed_update: BedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
):
    """Update bed information (manager, regional admin, super admin)"""
    service = BedService(db)
    return service.update_bed(bed_id, bed_update)


@router.post("/{bed_id}/assign", response_model=BedResponse)
def assign_bed(
    bed_id: UUID,
    assign_data: BedAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager", "nurse")),
):
    """Assign bed to patient/visit (manager, nurse)"""
    service = BedService(db)
    return service.assign_bed(bed_id, assign_data)


@router.post("/{bed_id}/release", response_model=BedResponse)
def release_bed(
    bed_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager", "nurse")),
):
    """Release bed (make available) (manager, nurse)"""
    service = BedService(db)
    return service.release_bed(bed_id)


@router.post("/{bed_id}/maintenance", response_model=BedResponse)
def set_bed_maintenance(
    bed_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager")),
):
    """Set bed to maintenance mode (manager only)"""
    service = BedService(db)
    return service.set_bed_maintenance(bed_id)


@router.get("/availability/{hospital_id}", response_model=dict)
def get_bed_availability(
    hospital_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get bed availability statistics for a hospital"""
    service = BedService(db)
    return service.get_bed_availability(hospital_id)
