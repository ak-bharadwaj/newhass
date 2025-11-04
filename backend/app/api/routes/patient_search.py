"""Global patient search API routes with optimized fallback search"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.services.patient_search import PatientSearchService
from app.models.user import User
from app.models.patient import Patient
from app.models.patient_hospital import PatientHospital
from app.schemas.patient_search import (
    GlobalPatientSearchRequest,
    GlobalPatientSearchResponse,
    PatientHospitalCreate
)

router = APIRouter()


@router.get("/global", response_model=Optional[GlobalPatientSearchResponse])
def search_global_patient(
    query: str = Query(..., min_length=2, max_length=200),
    search_by: str = Query(
        "auto",
        regex="^(auto|national_id|phone|email|name|mrn)$"
    ),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Fast global patient search with intelligent fallback.

    Search priority (when search_by="auto"):
    1. National ID / Passport
    2. Phone number
    3. Email
    4. MRN (across all hospitals)
    5. Name

    All searches use database indexes for O(log n) complexity - NO SPEED COMPROMISE!
    Results are cached for 5 minutes.

    Accessible by: All authenticated users
    """
    patient = PatientSearchService.search_global_patient(
        db=db,
        search_query=query,
        search_by=search_by
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Get patient's hospital relationships
    patient_hospitals = PatientSearchService.get_patient_hospitals(db, patient.id)

    hospitals_data = []
    for ph in patient_hospitals:
        hospitals_data.append({
            "hospital_id": str(ph.hospital_id),
            "local_mrn": ph.local_mrn,
            "hospital_name": ph.hospital.name if ph.hospital else "Unknown"
        })

    return GlobalPatientSearchResponse(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        phone=patient.phone,
        email=patient.email,
        national_id=patient.national_id,
        passport_number=patient.passport_number,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        hospitals=hospitals_data,
        is_active=patient.is_active
    )


@router.get("/advanced", response_model=List[GlobalPatientSearchResponse])
def advanced_patient_search(
    phone: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    national_id: Optional[str] = Query(None),
    first_name: Optional[str] = Query(None),
    last_name: Optional[str] = Query(None),
    date_of_birth: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Advanced patient search with multiple criteria.

    Returns list of matching patients (up to limit).
    All criteria are combined with AND logic.

    Accessible by: All authenticated users
    """
    patients = PatientSearchService.search_patients_advanced(
        db=db,
        phone=phone,
        email=email,
        national_id=national_id,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=date_of_birth,
        limit=limit
    )

    results = []
    for patient in patients:
        patient_hospitals = PatientSearchService.get_patient_hospitals(db, patient.id)
        hospitals_data = [
            {
                "hospital_id": str(ph.hospital_id),
                "local_mrn": ph.local_mrn,
                "hospital_name": ph.hospital.name if ph.hospital else "Unknown"
            }
            for ph in patient_hospitals
        ]

        results.append(GlobalPatientSearchResponse(
            id=patient.id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            phone=patient.phone,
            email=patient.email,
            national_id=patient.national_id,
            passport_number=patient.passport_number,
            blood_group=patient.blood_group,
            allergies=patient.allergies,
            hospitals=hospitals_data,
            is_active=patient.is_active
        ))

    return results


@router.get("/by-hospital-mrn/{hospital_id}/{mrn}", response_model=Optional[GlobalPatientSearchResponse])
def get_patient_by_hospital_mrn(
    hospital_id: UUID,
    mrn: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Fast lookup: Get patient by hospital-specific MRN.

    Uses optimized index on (hospital_id, local_mrn) for O(log n) lookup.

    Accessible by: All authenticated users
    """
    patient = PatientSearchService.get_patient_by_hospital_mrn(
        db=db,
        hospital_id=hospital_id,
        mrn=mrn
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient not found with MRN {mrn} at hospital {hospital_id}"
        )

    # Get patient's hospital relationships
    patient_hospitals = PatientSearchService.get_patient_hospitals(db, patient.id)

    hospitals_data = []
    for ph in patient_hospitals:
        hospitals_data.append({
            "hospital_id": str(ph.hospital_id),
            "local_mrn": ph.local_mrn,
            "hospital_name": ph.hospital.name if ph.hospital else "Unknown"
        })

    return GlobalPatientSearchResponse(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        phone=patient.phone,
        email=patient.email,
        national_id=patient.national_id,
        passport_number=patient.passport_number,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        hospitals=hospitals_data,
        is_active=patient.is_active
    )


@router.post("/check-duplicate", response_model=Optional[GlobalPatientSearchResponse])
def check_duplicate_patient(
    national_id: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    current_user: User = Depends(require_role("manager", "super_admin")),
    db: Session = Depends(get_db),
):
    """
    Check if patient already exists before creating new record.
    Prevents duplicate patients in global database.

    Accessible by: Admin, Manager only
    """
    if not national_id and not phone and not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of national_id, phone, or email must be provided"
        )

    patient = PatientSearchService.check_duplicate_patient(
        db=db,
        national_id=national_id,
        phone=phone,
        email=email
    )

    if not patient:
        return None

    # Get patient's hospital relationships
    patient_hospitals = PatientSearchService.get_patient_hospitals(db, patient.id)

    hospitals_data = []
    for ph in patient_hospitals:
        hospitals_data.append({
            "hospital_id": str(ph.hospital_id),
            "local_mrn": ph.local_mrn,
            "hospital_name": ph.hospital.name if ph.hospital else "Unknown"
        })

    return GlobalPatientSearchResponse(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        phone=patient.phone,
        email=patient.email,
        national_id=patient.national_id,
        passport_number=patient.passport_number,
        blood_group=patient.blood_group,
        allergies=patient.allergies,
        hospitals=hospitals_data,
        is_active=patient.is_active
    )


@router.get("/{patient_id}/hospitals", response_model=List[dict])
def get_patient_hospital_links(
    patient_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all hospitals where patient has been treated.

    Returns list of hospital relationships with local MRN per hospital.

    Accessible by: All authenticated users
    """
    patient_hospitals = PatientSearchService.get_patient_hospitals(db, patient_id)

    return [
        {
            "id": str(ph.id),
            "patient_id": str(ph.patient_id),
            "hospital_id": str(ph.hospital_id),
            "hospital_name": ph.hospital.name if ph.hospital else "Unknown",
            "local_mrn": ph.local_mrn,
            "first_visit_date": ph.first_visit_date,
            "last_visit_date": ph.last_visit_date,
            "total_visits": ph.total_visits,
            "is_active": ph.is_active
        }
        for ph in patient_hospitals
    ]
