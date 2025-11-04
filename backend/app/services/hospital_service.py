"""Hospital service for hospital management"""
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status

from app.models.hospital import Hospital
from app.models.region import Region
from app.models.user import User
from app.models.role import Role
from app.models.patient import Patient
from app.models.bed import Bed
from app.schemas.hospital import (
    HospitalCreate,
    HospitalUpdate,
    HospitalResponse,
    HospitalWithStats,
)


class HospitalService:
    """Service for hospital operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_all_hospitals(self) -> List[HospitalWithStats]:
        """Get all hospitals with statistics"""
        hospitals = self.db.query(Hospital).filter(Hospital.is_active == True).all()

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

    def get_hospital(self, hospital_id: UUID) -> HospitalWithStats:
        """Get a single hospital with statistics"""
        hospital = self.db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

        # Calculate stats
        occupied_beds = (
            self.db.query(func.count(Bed.id))
            .filter(
                and_(
                    Bed.hospital_id == hospital.id, Bed.status == "occupied", Bed.is_active == True
                )
            )
            .scalar()
            or 0
        )

        available_beds = (
            self.db.query(func.count(Bed.id))
            .filter(
                and_(
                    Bed.hospital_id == hospital.id, Bed.status == "available", Bed.is_active == True
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

        return HospitalWithStats(
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

    def create_hospital(self, hospital_data: HospitalCreate) -> HospitalResponse:
        """Create a new hospital"""
        # Verify region exists
        region = self.db.query(Region).filter(Region.id == hospital_data.region_id).first()
        if not region:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")

        # Check if code already exists
        existing_hospital = (
            self.db.query(Hospital).filter(Hospital.code == hospital_data.code).first()
        )
        if existing_hospital:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital code already exists"
            )

        new_hospital = Hospital(
            region_id=hospital_data.region_id,
            name=hospital_data.name,
            code=hospital_data.code,
            address=hospital_data.address,
            phone=hospital_data.phone,
            email=hospital_data.email,
            bed_capacity=hospital_data.bed_capacity,
            is_active=hospital_data.is_active,
        )

        self.db.add(new_hospital)
        self.db.commit()
        self.db.refresh(new_hospital)

        return HospitalResponse(
            id=new_hospital.id,
            region_id=new_hospital.region_id,
            name=new_hospital.name,
            code=new_hospital.code,
            address=new_hospital.address,
            phone=new_hospital.phone,
            email=new_hospital.email,
            bed_capacity=new_hospital.bed_capacity,
            is_active=new_hospital.is_active,
            created_at=new_hospital.created_at,
            updated_at=new_hospital.updated_at,
        )

    def update_hospital(self, hospital_id: UUID, hospital_data: HospitalUpdate) -> HospitalResponse:
        """Update a hospital"""
        hospital = self.db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

        # Check code uniqueness if changing
        if hospital_data.code and hospital_data.code != hospital.code:
            existing_code = (
                self.db.query(Hospital).filter(Hospital.code == hospital_data.code).first()
            )
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital code already exists"
                )

        # Update fields
        if hospital_data.name is not None:
            hospital.name = hospital_data.name
        if hospital_data.code is not None:
            hospital.code = hospital_data.code
        if hospital_data.address is not None:
            hospital.address = hospital_data.address
        if hospital_data.phone is not None:
            hospital.phone = hospital_data.phone
        if hospital_data.email is not None:
            hospital.email = hospital_data.email
        if hospital_data.bed_capacity is not None:
            hospital.bed_capacity = hospital_data.bed_capacity
        if hospital_data.is_active is not None:
            hospital.is_active = hospital_data.is_active

        self.db.commit()
        self.db.refresh(hospital)

        return HospitalResponse(
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
        )
