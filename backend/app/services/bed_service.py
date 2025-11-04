"""Bed management service"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.models.bed import Bed
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.visit import Visit
from app.schemas.bed import BedCreate, BedUpdate, BedAssign, BedResponse


class BedService:
    def __init__(self, db: Session):
        self.db = db

    def create_bed(self, bed_data: BedCreate) -> BedResponse:
        """Create a new bed"""
        # Verify hospital exists
        hospital = self.db.query(Hospital).filter(Hospital.id == bed_data.hospital_id).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital not found"
            )

        # Check for duplicate bed number in hospital
        existing = self.db.query(Bed).filter(
            and_(
                Bed.hospital_id == bed_data.hospital_id,
                Bed.bed_number == bed_data.bed_number
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed {bed_data.bed_number} already exists in this hospital"
            )

        # Validate bed type
        valid_types = ["standard", "icu", "isolation"]
        if bed_data.bed_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid bed_type. Must be one of: {', '.join(valid_types)}"
            )

        bed = Bed(
            hospital_id=bed_data.hospital_id,
            bed_number=bed_data.bed_number,
            ward=bed_data.ward,
            floor=bed_data.floor,
            bed_type=bed_data.bed_type,
            status="available",
        )
        self.db.add(bed)
        self.db.commit()
        self.db.refresh(bed)

        return self._to_response(bed)

    def get_bed(self, bed_id: UUID) -> BedResponse:
        """Get bed by ID"""
        bed = self.db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found"
            )
        return self._to_response(bed)

    def get_hospital_beds(
        self,
        hospital_id: UUID,
        status: Optional[str] = None,
        ward: Optional[str] = None,
        bed_type: Optional[str] = None,
        is_active: Optional[bool] = True,
    ) -> List[BedResponse]:
        """Get all beds in a hospital with optional filters"""
        query = self.db.query(Bed).filter(Bed.hospital_id == hospital_id)

        if status:
            query = query.filter(Bed.status == status)
        if ward:
            query = query.filter(Bed.ward == ward)
        if bed_type:
            query = query.filter(Bed.bed_type == bed_type)
        if is_active is not None:
            query = query.filter(Bed.is_active == is_active)

        beds = query.order_by(Bed.ward, Bed.bed_number).all()
        return [self._to_response(bed) for bed in beds]

    def update_bed(self, bed_id: UUID, bed_update: BedUpdate) -> BedResponse:
        """Update bed information"""
        bed = self.db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found"
            )

        # Update fields
        update_data = bed_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(bed, field, value)

        self.db.commit()
        self.db.refresh(bed)
        return self._to_response(bed)

    def assign_bed(self, bed_id: UUID, assign_data: BedAssign) -> BedResponse:
        """Assign bed to patient/visit"""
        bed = self.db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found"
            )

        # Check bed is available
        if bed.status != "available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed is not available (current status: {bed.status})"
            )

        # Verify patient exists
        patient = self.db.query(Patient).filter(Patient.id == assign_data.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        # Verify visit exists and is active
        visit = self.db.query(Visit).filter(Visit.id == assign_data.visit_id).first()
        if not visit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visit not found"
            )
        if visit.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Visit is not active"
            )

        # Check if patient already has a bed assigned for this visit
        existing_bed = self.db.query(Bed).filter(
            and_(
                Bed.assigned_visit_id == assign_data.visit_id,
                Bed.status == "occupied",
                Bed.id != bed_id
            )
        ).first()
        if existing_bed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient already has bed {existing_bed.bed_number} assigned for this visit"
            )

        # Assign bed
        bed.assigned_patient_id = assign_data.patient_id
        bed.assigned_visit_id = assign_data.visit_id
        bed.status = "occupied"
        bed.assigned_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(bed)
        return self._to_response(bed)

    def release_bed(self, bed_id: UUID) -> BedResponse:
        """Release bed (make available)"""
        bed = self.db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found"
            )

        if bed.status != "occupied":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed is not occupied (current status: {bed.status})"
            )

        # Release bed
        bed.assigned_patient_id = None
        bed.assigned_visit_id = None
        bed.status = "available"
        bed.assigned_at = None

        self.db.commit()
        self.db.refresh(bed)
        return self._to_response(bed)

    def set_bed_maintenance(self, bed_id: UUID) -> BedResponse:
        """Set bed to maintenance mode"""
        bed = self.db.query(Bed).filter(Bed.id == bed_id).first()
        if not bed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found"
            )

        if bed.status == "occupied":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set occupied bed to maintenance"
            )

        bed.status = "maintenance"
        self.db.commit()
        self.db.refresh(bed)
        return self._to_response(bed)

    def get_bed_availability(self, hospital_id: UUID) -> dict:
        """Get bed availability statistics for a hospital"""
        total = self.db.query(Bed).filter(
            and_(Bed.hospital_id == hospital_id, Bed.is_active == True)
        ).count()

        available = self.db.query(Bed).filter(
            and_(
                Bed.hospital_id == hospital_id,
                Bed.status == "available",
                Bed.is_active == True
            )
        ).count()

        occupied = self.db.query(Bed).filter(
            and_(
                Bed.hospital_id == hospital_id,
                Bed.status == "occupied",
                Bed.is_active == True
            )
        ).count()

        maintenance = self.db.query(Bed).filter(
            and_(
                Bed.hospital_id == hospital_id,
                Bed.status == "maintenance",
                Bed.is_active == True
            )
        ).count()

        return {
            "total": total,
            "available": available,
            "occupied": occupied,
            "maintenance": maintenance,
            "occupancy_rate": round((occupied / total * 100) if total > 0 else 0, 2)
        }

    def _to_response(self, bed: Bed) -> BedResponse:
        """Convert Bed model to response schema"""
        response_data = {
            "id": bed.id,
            "hospital_id": bed.hospital_id,
            "hospital_name": bed.hospital.name if bed.hospital else None,
            "bed_number": bed.bed_number,
            "ward": bed.ward,
            "floor": bed.floor,
            "bed_type": bed.bed_type,
            "status": bed.status,
            "assigned_patient_id": bed.assigned_patient_id,
            "assigned_patient_name": None,
            "assigned_patient_mrn": None,
            "assigned_visit_id": bed.assigned_visit_id,
            "assigned_at": bed.assigned_at,
            "is_active": bed.is_active,
            "created_at": bed.created_at,
            "updated_at": bed.updated_at,
        }

        if bed.assigned_patient:
            response_data["assigned_patient_name"] = f"{bed.assigned_patient.first_name} {bed.assigned_patient.last_name}"
            response_data["assigned_patient_mrn"] = bed.assigned_patient.mrn

        return BedResponse(**response_data)
