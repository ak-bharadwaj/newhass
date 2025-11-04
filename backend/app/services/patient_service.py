"""Patient service for patient management"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, or_
from fastapi import HTTPException, status

from app.models.patient import Patient
from app.models.hospital import Hospital
from app.models.visit import Visit
from app.models.vitals import Vitals
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientWithVitals, PaginatedPatients
from app.schemas.doctor import DoctorBrief


class PatientService:
    """Service for patient operations"""

    def __init__(self, db: Session):
        self.db = db

    def generate_mrn(self, hospital_id: UUID) -> str:
        """Generate unique Medical Record Number"""
        hospital = self.db.query(Hospital).filter(Hospital.id == hospital_id).first()
        hospital_code = hospital.code if hospital else "UNK"

        # Get count of patients in hospital
        patient_count = self.db.query(func.count(Patient.id)).filter(Patient.hospital_id == hospital_id).scalar() or 0

        # Format: HOSPITALCODE-NNNNNN
        return f"{hospital_code}-{str(patient_count + 1).zfill(6)}"

    def create_patient(self, patient_data: PatientCreate) -> PatientResponse:
        """Create new patient"""
        # Verify hospital exists
        hospital = self.db.query(Hospital).filter(Hospital.id == patient_data.hospital_id).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

        # Generate MRN
        mrn = self.generate_mrn(patient_data.hospital_id)

        # Create patient
        patient = Patient(
            hospital_id=patient_data.hospital_id,
            mrn=mrn,
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            blood_group=patient_data.blood_group,
            phone=patient_data.phone,
            email=patient_data.email,
            address=patient_data.address,
            emergency_contact_name=patient_data.emergency_contact_name,
            emergency_contact_phone=patient_data.emergency_contact_phone,
            allergies=patient_data.allergies,
        )

        self.db.add(patient)
        self.db.commit()
        self.db.refresh(patient)

        return PatientResponse(
            id=patient.id,
            mrn=patient.mrn,
            hospital_id=patient.hospital_id,
            hospital_name=hospital.name,
            user_id=patient.user_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            blood_group=patient.blood_group,
            phone=patient.phone,
            email=patient.email,
            address=patient.address,
            emergency_contact_name=patient.emergency_contact_name,
            emergency_contact_phone=patient.emergency_contact_phone,
            allergies=patient.allergies,
            is_active=patient.is_active,
            created_at=patient.created_at,
            updated_at=patient.updated_at,
        )

    def get_patient(self, patient_id: UUID) -> PatientResponse:
        """Get patient by ID"""
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        hospital = self.db.query(Hospital).filter(Hospital.id == patient.hospital_id).first()

        return PatientResponse(
            id=patient.id,
            mrn=patient.mrn,
            hospital_id=patient.hospital_id,
            hospital_name=hospital.name if hospital else None,
            user_id=patient.user_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            blood_group=patient.blood_group,
            phone=patient.phone,
            email=patient.email,
            address=patient.address,
            emergency_contact_name=patient.emergency_contact_name,
            emergency_contact_phone=patient.emergency_contact_phone,
            allergies=patient.allergies,
            is_active=patient.is_active,
            created_at=patient.created_at,
            updated_at=patient.updated_at,
        )

    def get_patient_by_user_id(self, user_id: UUID) -> PatientResponse:
        """Get patient record linked to a user account"""
        patient = self.db.query(Patient).filter(Patient.user_id == user_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found for user")

        hospital = self.db.query(Hospital).filter(Hospital.id == patient.hospital_id).first()

        return PatientResponse(
            id=patient.id,
            mrn=patient.mrn,
            hospital_id=patient.hospital_id,
            hospital_name=hospital.name if hospital else None,
            user_id=patient.user_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            blood_group=patient.blood_group,
            phone=patient.phone,
            email=patient.email,
            address=patient.address,
            emergency_contact_name=patient.emergency_contact_name,
            emergency_contact_phone=patient.emergency_contact_phone,
            allergies=patient.allergies,
            is_active=patient.is_active,
            created_at=patient.created_at,
            updated_at=patient.updated_at,
        )

    def get_patients_for_doctor(self, doctor_id: UUID) -> List[PatientWithVitals]:
        """Get patients assigned to a doctor with latest vitals"""
        # Get active visits for this doctor
        visits = (
            self.db.query(Visit)
            .filter(and_(Visit.attending_doctor_id == doctor_id, Visit.status == "active"))
            .all()
        )

        patient_ids = [visit.patient_id for visit in visits]
        if not patient_ids:
            return []

        patients = self.db.query(Patient).filter(Patient.id.in_(patient_ids)).all()

        result = []
        for patient in patients:
            hospital = self.db.query(Hospital).filter(Hospital.id == patient.hospital_id).first()

            # Get latest vitals
            latest_vitals = (
                self.db.query(Vitals)
                .filter(Vitals.patient_id == patient.id)
                .order_by(desc(Vitals.recorded_at))
                .first()
            )

            latest_bp = None
            if latest_vitals and latest_vitals.blood_pressure_systolic and latest_vitals.blood_pressure_diastolic:
                latest_bp = f"{latest_vitals.blood_pressure_systolic}/{latest_vitals.blood_pressure_diastolic}"

            result.append(PatientWithVitals(
                id=patient.id,
                mrn=patient.mrn,
                hospital_id=patient.hospital_id,
                hospital_name=hospital.name if hospital else None,
                user_id=patient.user_id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                date_of_birth=patient.date_of_birth,
                gender=patient.gender,
                blood_group=patient.blood_group,
                phone=patient.phone,
                email=patient.email,
                address=patient.address,
                emergency_contact_name=patient.emergency_contact_name,
                emergency_contact_phone=patient.emergency_contact_phone,
                allergies=patient.allergies,
                is_active=patient.is_active,
                created_at=patient.created_at,
                updated_at=patient.updated_at,
                latest_temperature=float(latest_vitals.temperature) if latest_vitals and latest_vitals.temperature else None,
                latest_heart_rate=latest_vitals.heart_rate if latest_vitals else None,
                latest_blood_pressure=latest_bp,
                latest_spo2=latest_vitals.spo2 if latest_vitals else None,
                vitals_updated_at=latest_vitals.recorded_at if latest_vitals else None,
                has_abnormal_vitals=latest_vitals.is_abnormal if latest_vitals else False,
            ))

        return result

    def get_patients_for_nurse(self, nurse_id: UUID, hospital_id: UUID) -> List[PatientWithVitals]:
        """Get patients in nurse's hospital with active visits"""
        # Get active visits in hospital
        visits = (
            self.db.query(Visit)
            .filter(and_(Visit.hospital_id == hospital_id, Visit.status == "active"))
            .all()
        )

        patient_ids = [visit.patient_id for visit in visits]
        if not patient_ids:
            return []

        patients = self.db.query(Patient).filter(Patient.id.in_(patient_ids)).all()

        result = []
        for patient in patients:
            hospital = self.db.query(Hospital).filter(Hospital.id == patient.hospital_id).first()

            # Get latest vitals
            latest_vitals = (
                self.db.query(Vitals)
                .filter(Vitals.patient_id == patient.id)
                .order_by(desc(Vitals.recorded_at))
                .first()
            )

            latest_bp = None
            if latest_vitals and latest_vitals.blood_pressure_systolic and latest_vitals.blood_pressure_diastolic:
                latest_bp = f"{latest_vitals.blood_pressure_systolic}/{latest_vitals.blood_pressure_diastolic}"

            result.append(PatientWithVitals(
                id=patient.id,
                mrn=patient.mrn,
                hospital_id=patient.hospital_id,
                hospital_name=hospital.name if hospital else None,
                user_id=patient.user_id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                date_of_birth=patient.date_of_birth,
                gender=patient.gender,
                blood_group=patient.blood_group,
                phone=patient.phone,
                email=patient.email,
                address=patient.address,
                emergency_contact_name=patient.emergency_contact_name,
                emergency_contact_phone=patient.emergency_contact_phone,
                allergies=patient.allergies,
                is_active=patient.is_active,
                created_at=patient.created_at,
                updated_at=patient.updated_at,
                latest_temperature=float(latest_vitals.temperature) if latest_vitals and latest_vitals.temperature else None,
                latest_heart_rate=latest_vitals.heart_rate if latest_vitals else None,
                latest_blood_pressure=latest_bp,
                latest_spo2=latest_vitals.spo2 if latest_vitals else None,
                vitals_updated_at=latest_vitals.recorded_at if latest_vitals else None,
                has_abnormal_vitals=latest_vitals.is_abnormal if latest_vitals else False,
            ))

        return result

    def get_assigned_doctor(self, patient_id: UUID) -> Optional[DoctorBrief]:
        """Return the attending doctor for the patient's latest active visit (if any)"""
        # Find the most recent active visit for the patient
        visit = (
            self.db.query(Visit)
            .filter(Visit.patient_id == patient_id, Visit.status == "active")
            .order_by(Visit.admission_date.desc())
            .first()
        )
        if not visit or not visit.attending_doctor:
            return None

        doc = visit.attending_doctor
        return DoctorBrief(
            id=doc.id,
            full_name=f"Dr. {doc.first_name} {doc.last_name}",
            profile_picture_url=getattr(doc, 'profile_picture_url', None),
            qualification=getattr(doc, 'qualification', None),
            email=getattr(doc, 'email', None),
            phone=getattr(doc, 'phone', None),
            hospital_name=getattr(visit.hospital, 'name', None),
        )

    def search_patients(self, search: str, hospital_id: Optional[UUID] = None, page: int = 1, page_size: int = 50) -> PaginatedPatients:
        """Search patients by name, MRN, or phone"""
        query = self.db.query(Patient).filter(Patient.is_active == True)

        if hospital_id:
            query = query.filter(Patient.hospital_id == hospital_id)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.mrn.ilike(search_term),
                    Patient.phone.ilike(search_term),
                )
            )

        total = query.count()
        offset = (page - 1) * page_size
        patients = query.offset(offset).limit(page_size).all()

        patient_responses = []
        for patient in patients:
            hospital = self.db.query(Hospital).filter(Hospital.id == patient.hospital_id).first()
            patient_responses.append(PatientResponse(
                id=patient.id,
                mrn=patient.mrn,
                hospital_id=patient.hospital_id,
                hospital_name=hospital.name if hospital else None,
                user_id=patient.user_id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                date_of_birth=patient.date_of_birth,
                gender=patient.gender,
                blood_group=patient.blood_group,
                phone=patient.phone,
                email=patient.email,
                address=patient.address,
                emergency_contact_name=patient.emergency_contact_name,
                emergency_contact_phone=patient.emergency_contact_phone,
                allergies=patient.allergies,
                is_active=patient.is_active,
                created_at=patient.created_at,
                updated_at=patient.updated_at,
            ))

        return PaginatedPatients(patients=patient_responses, total=total, page=page, page_size=page_size)
