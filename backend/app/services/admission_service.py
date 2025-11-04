"""First-visit admission workflow service with permission enforcement"""
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from app.models.patient import Patient
from app.models.patient_hospital import PatientHospital
from app.models.visit import Visit
from app.models.case_sheet import CaseSheet
from app.models.user import User
from app.services.patient_search import PatientSearchService


class AdmissionService:
    """
    Service for first-visit patient admission workflow.

    Workflow:
    1. Check if patient exists globally (by national_id, phone, or email)
    2. If exists: Link to hospital with local MRN
    3. If new: Create global patient record (admin/manager only)
    4. Create patient-hospital link with local MRN
    5. Create visit record for admission
    6. If INPATIENT or EMERGENCY: Auto-create case sheet
    7. If OUTPATIENT: Suggest appointment scheduling
    8. Return admission details
    """

    def __init__(self, db: Session):
        self.db = db

    def admit_patient(
        self,
        # Patient identification (for finding existing)
        national_id: Optional[str],
        phone: Optional[str],
        email: Optional[str],
        # Patient demographics (for creating new)
        first_name: str,
        last_name: str,
        date_of_birth: date,
        gender: str,
        blood_group: Optional[str],
        address: Optional[str],
        emergency_contact_name: Optional[str],
        emergency_contact_phone: Optional[str],
        allergies: Optional[str],
        passport_number: Optional[str],
        # Hospital and visit details
        hospital_id: UUID,
        local_mrn: str,
        reason_for_visit: str,
        visit_type: str,  # inpatient, outpatient, emergency
        attending_doctor_id: Optional[UUID],
        # User performing admission
        admitted_by_user: User,
        # Optional: For outpatient, suggest appointment time
        appointment_time: Optional[datetime] = None
    ) -> dict:
        """
        Admit patient with full first-visit workflow.

        Visit Types:
        - EMERGENCY: Highest priority, auto-creates case sheet
        - INPATIENT: High priority, auto-creates case sheet
        - OUTPATIENT: Normal priority, schedules appointment

        Permission: Only admin or manager can create new global patient IDs
        """
        # Validate visit type
        if visit_type not in ["inpatient", "outpatient", "emergency"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="visit_type must be 'inpatient', 'outpatient', or 'emergency'"
            )

        # Step 1: Check if patient exists globally
        existing_patient = None
        if national_id or phone or email:
            existing_patient = PatientSearchService.check_duplicate_patient(
                db=self.db,
                national_id=national_id,
                phone=phone,
                email=email
            )

        patient = None
        is_new_patient = False

        if existing_patient:
            # Patient exists globally
            patient = existing_patient
            is_new_patient = False
        else:
            # New patient - check permission
            if admitted_by_user.role.name not in ["super_admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admin or manager can create new global patient records"
                )

            # Create new global patient
            patient = Patient(
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date_of_birth,
                gender=gender,
                blood_group=blood_group,
                phone=phone,
                email=email,
                address=address,
                emergency_contact_name=emergency_contact_name,
                emergency_contact_phone=emergency_contact_phone,
                allergies=allergies,
                national_id=national_id,
                passport_number=passport_number,
                is_global_record=True,
                created_by_user_id=admitted_by_user.id,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            self.db.add(patient)
            self.db.flush()  # Get patient ID without committing
            is_new_patient = True

        # Step 2: Check if patient already linked to this hospital
        existing_link = self.db.query(PatientHospital).filter(
            and_(
                PatientHospital.patient_id == patient.id,
                PatientHospital.hospital_id == hospital_id
            )
        ).first()

        patient_hospital = None
        if existing_link:
            # Update existing link
            patient_hospital = existing_link
            patient_hospital.last_visit_date = datetime.utcnow()
            patient_hospital.total_visits += 1
        else:
            # Step 3: Check if local MRN already used at this hospital
            mrn_exists = self.db.query(PatientHospital).filter(
                and_(
                    PatientHospital.hospital_id == hospital_id,
                    PatientHospital.local_mrn == local_mrn
                )
            ).first()

            if mrn_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"MRN {local_mrn} already exists at this hospital"
                )

            # Step 4: Create patient-hospital link
            patient_hospital = PatientHospital(
                patient_id=patient.id,
                hospital_id=hospital_id,
                local_mrn=local_mrn,
                first_visit_date=datetime.utcnow(),
                last_visit_date=datetime.utcnow(),
                total_visits=1,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            self.db.add(patient_hospital)

        # Step 5: Determine priority based on visit type
        priority = 3  # Default: outpatient
        if visit_type == "emergency":
            priority = 1  # Highest priority
        elif visit_type == "inpatient":
            priority = 2  # High priority

        # Step 6: Create visit record
        visit = Visit(
            patient_id=patient.id,
            hospital_id=hospital_id,
            attending_doctor_id=attending_doctor_id,
            visit_type=visit_type,
            admission_date=datetime.utcnow(),
            reason_for_visit=reason_for_visit,
            status="active",
            priority=priority,
            synced_to_global=False,
            sync_status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(visit)
        self.db.flush()  # Get visit ID

        # Step 7: Auto-create case sheet if INPATIENT or EMERGENCY
        case_sheet = None
        if visit_type in ["inpatient", "emergency"]:
            # Generate case number
            case_number = f"CS-{datetime.utcnow().strftime('%Y%m%d')}-{local_mrn}"

            case_sheet = CaseSheet(
                patient_id=patient.id,
                visit_id=visit.id,
                hospital_id=hospital_id,
                case_number=case_number,
                admission_date=datetime.utcnow(),
                chief_complaint=reason_for_visit,
                past_medical_history={
                    "allergies": allergies,
                    "chronic_conditions": []
                },
                event_timeline=[],
                progress_notes=[],
                created_by=admitted_by_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            self.db.add(case_sheet)

        # Commit all changes
        self.db.commit()
        self.db.refresh(patient)
        self.db.refresh(patient_hospital)
        self.db.refresh(visit)
        if case_sheet:
            self.db.refresh(case_sheet)

        result = {
            "success": True,
            "is_new_patient": is_new_patient,
            "visit_type": visit_type,
            "priority": priority,
            "priority_label": "EMERGENCY" if priority == 1 else ("HIGH" if priority == 2 else "NORMAL"),
            "patient": {
                "id": str(patient.id),
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "national_id": patient.national_id,
                "phone": patient.phone,
                "email": patient.email
            },
            "hospital_link": {
                "id": str(patient_hospital.id),
                "local_mrn": patient_hospital.local_mrn,
                "hospital_id": str(hospital_id),
                "total_visits": patient_hospital.total_visits
            },
            "visit": {
                "id": str(visit.id),
                "visit_type": visit.visit_type,
                "admission_date": visit.admission_date,
                "status": visit.status,
                "priority": priority
            }
        }

        # Add case sheet info if created
        if case_sheet:
            result["case_sheet"] = {
                "id": str(case_sheet.id),
                "case_number": case_sheet.case_number,
                "auto_created": True
            }
            result["message"] = f"{visit_type.upper()} admission complete. Case sheet auto-created."
        else:
            # Outpatient - suggest appointment scheduling
            result["message"] = "OUTPATIENT registration complete. Please schedule appointment to reduce wait time."
            result["suggestion"] = {
                "action": "schedule_appointment",
                "endpoint": "/api/v1/appointments",
                "recommended": True
            }

        return result

    def get_admission_summary(self, visit_id: UUID) -> Optional[dict]:
        """Get admission summary for a visit"""
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            return None

        patient = self.db.query(Patient).filter(Patient.id == visit.patient_id).first()

        patient_hospital = self.db.query(PatientHospital).filter(
            and_(
                PatientHospital.patient_id == visit.patient_id,
                PatientHospital.hospital_id == visit.hospital_id
            )
        ).first()

        # Check if case sheet exists
        case_sheet = self.db.query(CaseSheet).filter(
            CaseSheet.visit_id == visit_id
        ).first()

        return {
            "visit_id": str(visit.id),
            "patient": {
                "id": str(patient.id),
                "name": f"{patient.first_name} {patient.last_name}",
                "national_id": patient.national_id,
                "phone": patient.phone
            },
            "local_mrn": patient_hospital.local_mrn if patient_hospital else None,
            "admission_date": visit.admission_date,
            "visit_type": visit.visit_type,
            "priority": visit.priority if hasattr(visit, 'priority') else None,
            "status": visit.status,
            "attending_doctor_id": str(visit.attending_doctor_id) if visit.attending_doctor_id else None,
            "has_case_sheet": case_sheet is not None,
            "case_sheet_id": str(case_sheet.id) if case_sheet else None
        }
