"""Region API routes"""
from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.region_service import RegionService
from app.schemas.region import (
    RegionCreate,
    RegionUpdate,
    RegionResponse,
    RegionWithStats,
)
from app.schemas.hospital import HospitalWithStats
from app.models.user import User

router = APIRouter()


def get_region_service(db: Session = Depends(get_db)) -> RegionService:
    """Get region service instance"""
    return RegionService(db)


@router.get("", response_model=List[RegionWithStats])
def get_all_regions(
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Get all regions with statistics"""
    return region_service.get_all_regions()


@router.post("", response_model=RegionResponse)
def create_region(
    region_data: RegionCreate,
    current_user: User = Depends(require_role("super_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Create a new region"""
    return region_service.create_region(region_data)


@router.get("/{region_id}", response_model=RegionWithStats)
def get_region(
    region_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Get a single region with statistics"""
    return region_service.get_region(region_id)


@router.patch("/{region_id}", response_model=RegionResponse)
def update_region(
    region_id: UUID,
    region_data: RegionUpdate,
    current_user: User = Depends(require_role("super_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Update a region"""
    return region_service.update_region(region_id, region_data)


@router.get("/{region_id}/hospitals", response_model=List[HospitalWithStats])
def get_region_hospitals(
    region_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    region_service: RegionService = Depends(get_region_service),
):
    """Get all hospitals in a region with statistics"""
    return region_service.get_region_hospitals(region_id)


@router.get("/{region_id}/metrics", response_model=Dict[str, Any])
def get_region_metrics(
    region_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Get detailed metrics for a region"""
    return region_service.get_region_metrics(region_id)


@router.patch("/{region_id}/settings", response_model=RegionResponse)
def update_region_settings(
    region_id: UUID,
    theme_settings: dict = Body(...),
    current_user: User = Depends(require_role("regional_admin")),
    region_service: RegionService = Depends(get_region_service),
):
    """Update region theme settings"""
    return region_service.update_region_settings(region_id, theme_settings)
