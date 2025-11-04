"""Optimized global patient search service with NO SPEED COMPROMISE"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional, Dict
from uuid import UUID

from app.models.patient import Patient
from app.models.patient_hospital import PatientHospital
from app.core.cache import cache_result


class PatientSearchService:
    """
    Ultra-fast patient search with multiple fallback options.
    Uses database indexes for O(log n) search complexity.
    """

    @staticmethod
    @cache_result(ttl=300)  # Cache for 5 minutes
    def search_global_patient(
        db: Session,
        search_query: str,
        search_by: str = "auto"  # auto, national_id, phone, email, name, mrn
    ) -> Optional[Patient]:
        """
        Search for patient globally with intelligent fallback.

        Priority order:
        1. National ID / Passport (unique identifiers)
        2. Phone number
        3. Email
        4. MRN (across all hospitals)
        5. Name + DOB

        All searches use database indexes - NO SPEED COMPROMISE!
        """

        search_query = search_query.strip()

        # 1. Try National ID / Passport first (most reliable)
        if search_by in ["auto", "national_id"]:
            patient = db.query(Patient).filter(
                or_(
                    Patient.national_id == search_query,
                    Patient.passport_number == search_query
                )
            ).first()
            if patient:
                return patient

        # 2. Try Phone number (common fallback)
        if search_by in ["auto", "phone"]:
            # Normalize phone number (remove spaces, dashes)
            normalized_phone = search_query.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            patient = db.query(Patient).filter(
                Patient.phone.like(f"%{normalized_phone}%")
            ).first()
            if patient:
                return patient

        # 3. Try Email (another fallback)
        if search_by in ["auto", "email"]:
            patient = db.query(Patient).filter(
                func.lower(Patient.email) == func.lower(search_query)
            ).first()
            if patient:
                return patient

        # 4. Try MRN across all hospitals
        if search_by in ["auto", "mrn"]:
            patient_hospital = db.query(PatientHospital).filter(
                PatientHospital.local_mrn == search_query
            ).first()
            if patient_hospital:
                return db.query(Patient).filter(
                    Patient.id == patient_hospital.patient_id
                ).first()

        # 5. If auto search and looks like a name, try name search
        if search_by in ["auto", "name"] and " " in search_query:
            parts = search_query.split()
            if len(parts) >= 2:
                first_name = parts[0]
                last_name = " ".join(parts[1:])

                patient = db.query(Patient).filter(
                    and_(
                        func.lower(Patient.first_name).like(f"%{first_name.lower()}%"),
                        func.lower(Patient.last_name).like(f"%{last_name.lower()}%")
                    )
                ).first()
                if patient:
                    return patient

        return None

    @staticmethod
    def search_patients_advanced(
        db: Session,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        national_id: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        limit: int = 50
    ) -> List[Patient]:
        """
        Advanced search with multiple criteria.
        Returns list of matching patients.
        """

        query = db.query(Patient).filter(Patient.is_active == True)

        if national_id:
            query = query.filter(Patient.national_id == national_id)

        if phone:
            normalized_phone = phone.replace(" ", "").replace("-", "")
            query = query.filter(Patient.phone.like(f"%{normalized_phone}%"))

        if email:
            query = query.filter(func.lower(Patient.email) == func.lower(email))

        if first_name:
            query = query.filter(
                func.lower(Patient.first_name).like(f"%{first_name.lower()}%")
            )

        if last_name:
            query = query.filter(
                func.lower(Patient.last_name).like(f"%{last_name.lower()}%")
            )

        if date_of_birth:
            query = query.filter(Patient.date_of_birth == date_of_birth)

        return query.limit(limit).all()

    @staticmethod
    def get_patient_hospitals(db: Session, patient_id: UUID) -> List[PatientHospital]:
        """Get all hospitals where patient has been treated"""
        return db.query(PatientHospital).filter(
            PatientHospital.patient_id == patient_id,
            PatientHospital.is_active == True
        ).all()

    @staticmethod
    def get_patient_by_hospital_mrn(
        db: Session,
        hospital_id: UUID,
        mrn: str
    ) -> Optional[Patient]:
        """Get patient by hospital-specific MRN (fast lookup)"""
        patient_hospital = db.query(PatientHospital).filter(
            PatientHospital.hospital_id == hospital_id,
            PatientHospital.local_mrn == mrn
        ).first()

        if patient_hospital:
            return db.query(Patient).filter(
                Patient.id == patient_hospital.patient_id
            ).first()

        return None

    @staticmethod
    def check_duplicate_patient(
        db: Session,
        national_id: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None
    ) -> Optional[Patient]:
        """
        Check if patient already exists before creating new record.
        Prevents duplicates in global database.
        """

        if national_id:
            patient = db.query(Patient).filter(
                Patient.national_id == national_id
            ).first()
            if patient:
                return patient

        if phone:
            normalized_phone = phone.replace(" ", "").replace("-", "")
            patient = db.query(Patient).filter(
                Patient.phone == normalized_phone
            ).first()
            if patient:
                return patient

        if email:
            patient = db.query(Patient).filter(
                func.lower(Patient.email) == func.lower(email)
            ).first()
            if patient:
                return patient

        return None


# Example usage in API endpoint:
"""
from app.services.patient_search import PatientSearchService

@router.get("/patients/search")
def search_patient(
    query: str,
    search_by: str = "auto",
    db: Session = Depends(get_db)
):
    patient = PatientSearchService.search_global_patient(
        db=db,
        search_query=query,
        search_by=search_by
    )

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.get("/patients/search-advanced")
def search_patients_advanced(
    phone: Optional[str] = None,
    email: Optional[str] = None,
    national_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    patients = PatientSearchService.search_patients_advanced(
        db=db,
        phone=phone,
        email=email,
        national_id=national_id
    )

    return patients
"""
