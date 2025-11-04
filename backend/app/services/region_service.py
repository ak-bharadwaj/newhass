"""Region service for region management"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status

from app.models.region import Region
from app.models.hospital import Hospital
from app.models.user import User
from app.models.role import Role
from app.models.patient import Patient
from app.models.bed import Bed
from app.models.inventory import Inventory
from app.schemas.region import (
    RegionCreate,
    RegionUpdate,
    RegionResponse,
    RegionWithStats,
)
from app.schemas.hospital import HospitalWithStats


class RegionService:
    """Service for region operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_all_regions(self) -> List[RegionWithStats]:
        """Get all regions with statistics"""
        regions = self.db.query(Region).filter(Region.is_active == True).all()

        region_list = []
        for region in regions:
            # Calculate stats
            hospitals_count = (
                self.db.query(func.count(Hospital.id))
                .filter(and_(Hospital.region_id == region.id, Hospital.is_active == True))
                .scalar()
                or 0
            )

            active_beds = (
                self.db.query(func.count(Bed.id))
                .join(Hospital)
                .filter(
                    and_(
                        Hospital.region_id == region.id,
                        Bed.status == "occupied",
                        Bed.is_active == True,
                    )
                )
                .scalar()
                or 0
            )

            total_staff = (
                self.db.query(func.count(User.id))
                .join(Role)
                .filter(
                    and_(
                        User.region_id == region.id,
                        User.is_active == True,
                        User.is_deleted == False,
                        Role.name != "patient",
                    )
                )
                .scalar()
                or 0
            )

            total_patients = (
                self.db.query(func.count(Patient.id))
                .join(Hospital)
                .filter(and_(Hospital.region_id == region.id, Patient.is_active == True))
                .scalar()
                or 0
            )

            region_list.append(
                RegionWithStats(
                    id=region.id,
                    name=region.name,
                    code=region.code,
                    theme_settings=region.theme_settings,
                    is_active=region.is_active,
                    created_at=region.created_at,
                    updated_at=region.updated_at,
                    hospitals_count=hospitals_count,
                    active_beds=active_beds,
                    total_staff=total_staff,
                    total_patients=total_patients,
                )
            )

        return region_list

    def get_region(self, region_id: UUID) -> RegionWithStats:
        """Get a single region with statistics"""
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        # Calculate stats
        hospitals_count = (
            self.db.query(func.count(Hospital.id))
            .filter(and_(Hospital.region_id == region.id, Hospital.is_active == True))
            .scalar()
            or 0
        )

        active_beds = (
            self.db.query(func.count(Bed.id))
            .join(Hospital)
            .filter(
                and_(
                    Hospital.region_id == region.id, Bed.status == "occupied", Bed.is_active == True
                )
            )
            .scalar()
            or 0
        )

        total_staff = (
            self.db.query(func.count(User.id))
            .join(Role)
            .filter(
                and_(
                    User.region_id == region.id,
                    User.is_active == True,
                    User.is_deleted == False,
                    Role.name != "patient",
                )
            )
            .scalar()
            or 0
        )

        total_patients = (
            self.db.query(func.count(Patient.id))
            .join(Hospital)
            .filter(and_(Hospital.region_id == region.id, Patient.is_active == True))
            .scalar()
            or 0
        )

        return RegionWithStats(
            id=region.id,
            name=region.name,
            code=region.code,
            theme_settings=region.theme_settings,
            is_active=region.is_active,
            created_at=region.created_at,
            updated_at=region.updated_at,
            hospitals_count=hospitals_count,
            active_beds=active_beds,
            total_staff=total_staff,
            total_patients=total_patients,
        )

    def create_region(self, region_data: RegionCreate) -> RegionResponse:
        """Create a new region"""
        # Check if code already exists
        existing_region = self.db.query(Region).filter(Region.code == region_data.code).first()
        if existing_region:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Region code already exists"
            )

        # Check if name already exists
        existing_name = self.db.query(Region).filter(Region.name == region_data.name).first()
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Region name already exists"
            )

        new_region = Region(
            name=region_data.name,
            code=region_data.code,
            theme_settings=region_data.theme_settings,
            is_active=region_data.is_active,
        )

        self.db.add(new_region)
        self.db.commit()
        self.db.refresh(new_region)

        return RegionResponse(
            id=new_region.id,
            name=new_region.name,
            code=new_region.code,
            theme_settings=new_region.theme_settings,
            is_active=new_region.is_active,
            created_at=new_region.created_at,
            updated_at=new_region.updated_at,
        )

    def update_region(self, region_id: UUID, region_data: RegionUpdate) -> RegionResponse:
        """Update a region"""
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        # Check code uniqueness if changing
        if region_data.code and region_data.code != region.code:
            existing_code = self.db.query(Region).filter(Region.code == region_data.code).first()
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Region code already exists"
                )

        # Check name uniqueness if changing
        if region_data.name and region_data.name != region.name:
            existing_name = self.db.query(Region).filter(Region.name == region_data.name).first()
            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Region name already exists"
                )

        # Update fields
        if region_data.name is not None:
            region.name = region_data.name
        if region_data.code is not None:
            region.code = region_data.code
        if region_data.theme_settings is not None:
            region.theme_settings = region_data.theme_settings
        if region_data.is_active is not None:
            region.is_active = region_data.is_active

        self.db.commit()
        self.db.refresh(region)

        return RegionResponse(
            id=region.id,
            name=region.name,
            code=region.code,
            theme_settings=region.theme_settings,
            is_active=region.is_active,
            created_at=region.created_at,
            updated_at=region.updated_at,
        )

    def get_region_hospitals(self, region_id: UUID) -> List[HospitalWithStats]:
        """Get all hospitals in a region with statistics"""
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        hospitals = (
            self.db.query(Hospital)
            .filter(and_(Hospital.region_id == region_id, Hospital.is_active == True))
            .all()
        )

        hospital_list = []
        for hospital in hospitals:
            # Calculate stats
            occupied_beds = (
                self.db.query(func.count(Bed.id))
                .filter(
                    and_(
                        Bed.hospital_id == hospital.id,
                        Bed.status == "occupied",
                        Bed.is_active == True,
                    )
                )
                .scalar()
                or 0
            )

            available_beds = (
                self.db.query(func.count(Bed.id))
                .filter(
                    and_(
                        Bed.hospital_id == hospital.id,
                        Bed.status == "available",
                        Bed.is_active == True,
                    )
                )
                .scalar()
                or 0
            )

            staff_count = (
                self.db.query(func.count(User.id))
                .join(Role)
                .filter(
                    and_(
                        User.hospital_id == hospital.id,
                        User.is_active == True,
                        User.is_deleted == False,
                        Role.name != "patient",
                    )
                )
                .scalar()
                or 0
            )

            active_patients = (
                self.db.query(func.count(Patient.id))
                .filter(and_(Patient.hospital_id == hospital.id, Patient.is_active == True))
                .scalar()
                or 0
            )

            hospital_list.append(
                HospitalWithStats(
                    id=hospital.id,
                    region_id=hospital.region_id,
                    name=hospital.name,
                    code=hospital.code,
                    address=hospital.address,
                    phone=hospital.phone,
                    email=hospital.email,
                    bed_capacity=hospital.bed_capacity,
                    is_active=hospital.is_active,
                    created_at=hospital.created_at,
                    updated_at=hospital.updated_at,
                    occupied_beds=occupied_beds,
                    available_beds=available_beds,
                    staff_count=staff_count,
                    active_patients=active_patients,
                )
            )

        return hospital_list

    def get_region_metrics(self, region_id: UUID) -> Dict[str, Any]:
        """Get detailed metrics for a region"""
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        hospitals_count = (
            self.db.query(func.count(Hospital.id))
            .filter(and_(Hospital.region_id == region.id, Hospital.is_active == True))
            .scalar()
            or 0
        )

        total_beds = (
            self.db.query(func.count(Bed.id))
            .join(Hospital)
            .filter(
                and_(Hospital.region_id == region.id, Bed.is_active == True)
            )
            .scalar()
            or 0
        )

        occupied_beds = (
            self.db.query(func.count(Bed.id))
            .join(Hospital)
            .filter(
                and_(Hospital.region_id == region.id, Bed.status == "occupied", Bed.is_active == True)
            )
            .scalar()
            or 0
        )

        staff_count = (
            self.db.query(func.count(User.id))
            .join(Role)
            .filter(
                and_(
                    User.region_id == region.id,
                    User.is_active == True,
                    User.is_deleted == False,
                    Role.name != "patient",
                )
            )
            .scalar()
            or 0
        )

        total_patients = (
            self.db.query(func.count(Patient.id))
            .join(Hospital)
            .filter(and_(Hospital.region_id == region.id, Patient.is_active == True))
            .scalar()
            or 0
        )

        lab_backlog = 0  # Placeholder for future implementation

        return {
            "region_id": str(region.id),
            "region_name": region.name,
            "hospitals_count": hospitals_count,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": total_beds - occupied_beds,
            "bed_utilization": round((occupied_beds / total_beds * 100) if total_beds > 0 else 0, 2),
            "staff_count": staff_count,
            "total_patients": total_patients,
            "lab_backlog": lab_backlog,
        }

    def update_region_settings(self, region_id: UUID, theme_settings: dict) -> RegionResponse:
        """Update region theme settings"""
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        region.theme_settings = theme_settings
        self.db.commit()
        self.db.refresh(region)

        return RegionResponse(
            id=region.id,
            name=region.name,
            code=region.code,
            theme_settings=region.theme_settings,
            is_active=region.is_active,
            created_at=region.created_at,
            updated_at=region.updated_at,
        )
