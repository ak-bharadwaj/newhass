"""Clinical service for vitals, prescriptions, nurse logs, and lab tests"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from fastapi import HTTPException, status

from app.models.vitals import Vitals
from app.models.prescription import Prescription
from app.models.nurse_log import NurseLog
from app.models.lab_test import LabTest
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.user import User
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionUpdate, PrescriptionAdminister
from app.schemas.nurse_log import NurseLogCreate, NurseLogResponse
from app.schemas.lab_test import LabTestCreate, LabTestResponse, LabTestUpdate
from app.services.case_sheet_logger import CaseSheetLogger


class ClinicalService:
    """Service for clinical operations"""

    def __init__(self, db: Session):
        self.db = db
        self.case_sheet_logger = CaseSheetLogger(db)

    # ========== Vitals Operations ==========
    def record_vitals(self, vitals_data: VitalsCreate, recorded_by_id: UUID) -> VitalsResponse:
        """Record new vitals for a patient"""
        # Verify patient and visit exist
        patient = self.db.query(Patient).filter(Patient.id == vitals_data.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        visit = self.db.query(Visit).filter(Visit.id == vitals_data.visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        # Create vitals record
        vitals = Vitals(
            patient_id=vitals_data.patient_id,
            visit_id=vitals_data.visit_id,
            recorded_by_id=recorded_by_id,
            temperature=vitals_data.temperature,
            heart_rate=vitals_data.heart_rate,
            blood_pressure_systolic=vitals_data.blood_pressure_systolic,
            blood_pressure_diastolic=vitals_data.blood_pressure_diastolic,
            respiratory_rate=vitals_data.respiratory_rate,
            spo2=vitals_data.spo2,
            weight=vitals_data.weight,
            height=vitals_data.height,
            bmi=vitals_data.bmi,
            notes=vitals_data.notes,
            is_abnormal=vitals_data.is_abnormal,
        )

        self.db.add(vitals)
        self.db.commit()
        self.db.refresh(vitals)

        # Auto-log to case sheet if inpatient
        self.case_sheet_logger.log_vital_recorded(
            visit_id=vitals_data.visit_id,
            vital_id=vitals.id,
            vital_data={
                "temperature": float(vitals.temperature) if vitals.temperature else None,
                "heart_rate": vitals.heart_rate,
                "blood_pressure_systolic": vitals.blood_pressure_systolic,
                "blood_pressure_diastolic": vitals.blood_pressure_diastolic,
                "spo2": vitals.spo2,
                "notes": vitals.notes
            },
            recorded_by_id=recorded_by_id
        )

        # Get recorder name
        recorder = self.db.query(User).filter(User.id == recorded_by_id).first()
        recorder_name = f"{recorder.first_name} {recorder.last_name}" if recorder else None

        return VitalsResponse(
            id=vitals.id,
            patient_id=vitals.patient_id,
            visit_id=vitals.visit_id,
            recorded_by_id=vitals.recorded_by_id,
            recorded_by_name=recorder_name,
            recorded_at=vitals.recorded_at,
            temperature=vitals.temperature,
            heart_rate=vitals.heart_rate,
            blood_pressure_systolic=vitals.blood_pressure_systolic,
            blood_pressure_diastolic=vitals.blood_pressure_diastolic,
            respiratory_rate=vitals.respiratory_rate,
            spo2=vitals.spo2,
            weight=vitals.weight,
            height=vitals.height,
            bmi=vitals.bmi,
            notes=vitals.notes,
            is_abnormal=vitals.is_abnormal,
            acknowledged_by=vitals.acknowledged_by,
            acknowledged_at=vitals.acknowledged_at,
            acknowledgment_notes=vitals.acknowledgment_notes,
            created_at=vitals.created_at,
        )

    def get_patient_vitals(self, patient_id: UUID, limit: int = 50) -> List[VitalsResponse]:
        """Get vitals history for a patient"""
        vitals_list = (
            self.db.query(Vitals)
            .filter(Vitals.patient_id == patient_id)
            .order_by(desc(Vitals.recorded_at))
            .limit(limit)
            .all()
        )

        result = []
        for vitals in vitals_list:
            recorder = self.db.query(User).filter(User.id == vitals.recorded_by_id).first()
            recorder_name = f"{recorder.first_name} {recorder.last_name}" if recorder else None

            result.append(VitalsResponse(
                id=vitals.id,
                patient_id=vitals.patient_id,
                visit_id=vitals.visit_id,
                recorded_by_id=vitals.recorded_by_id,
                recorded_by_name=recorder_name,
                recorded_at=vitals.recorded_at,
                temperature=vitals.temperature,
                heart_rate=vitals.heart_rate,
                blood_pressure_systolic=vitals.blood_pressure_systolic,
                blood_pressure_diastolic=vitals.blood_pressure_diastolic,
                respiratory_rate=vitals.respiratory_rate,
                spo2=vitals.spo2,
                weight=vitals.weight,
                height=vitals.height,
                bmi=vitals.bmi,
                notes=vitals.notes,
                is_abnormal=vitals.is_abnormal,
                acknowledged_by=vitals.acknowledged_by,
                acknowledged_at=vitals.acknowledged_at,
                acknowledgment_notes=vitals.acknowledgment_notes,
                created_at=vitals.created_at,
            ))

        return result

    def list_lab_tests(
        self,
        hospital_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        status: Optional[str] = None,
        urgency: Optional[str] = None,
        assigned_to_id: Optional[UUID] = None,
        requested_by_id: Optional[UUID] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200,
    ) -> List[LabTestResponse]:
        """List lab tests with optional filters. Intended for lab_tech / doctor / nurse views."""
        query = self.db.query(LabTest).join(Visit, LabTest.visit_id == Visit.id)

        if hospital_id:
            query = query.filter(Visit.hospital_id == hospital_id)
        if patient_id:
            query = query.filter(LabTest.patient_id == patient_id)
        if status:
            query = query.filter(LabTest.status == status)
        if urgency:
            query = query.filter(LabTest.urgency == urgency)
        if assigned_to_id:
            query = query.filter(LabTest.assigned_to_id == assigned_to_id)
        if requested_by_id:
            query = query.filter(LabTest.requested_by_id == requested_by_id)
        # date filters (ISO date strings)
        if start_date:
            try:
                from datetime import datetime
                sd = datetime.fromisoformat(start_date)
                query = query.filter(LabTest.requested_at >= sd)
            except Exception:
                pass
        if end_date:
            try:
                from datetime import datetime
                ed = datetime.fromisoformat(end_date)
                query = query.filter(LabTest.requested_at <= ed)
            except Exception:
                pass

        tests = query.order_by(desc(LabTest.requested_at)).limit(limit).all()

        result: List[LabTestResponse] = []
        for test in tests:
            requester = self.db.query(User).filter(User.id == test.requested_by_id).first()
            requester_name = f"{requester.first_name} {requester.last_name}" if requester else None

            result.append(LabTestResponse(
                id=test.id,
                patient_id=test.patient_id,
                visit_id=test.visit_id,
                requested_by_id=test.requested_by_id,
                requested_by_name=requester_name,
                assigned_to_id=test.assigned_to_id,
                test_type=test.test_type,
                urgency=test.urgency,
                status=test.status,
                requested_at=test.requested_at,
                accepted_at=test.accepted_at,
                completed_at=test.completed_at,
                result_file_url=test.result_file_url,
                result_summary=test.result_summary,
                notes=test.notes,
                created_at=test.created_at,
                updated_at=test.updated_at,
            ))

        return result

    # ========== Prescription Operations ==========
    def create_prescription(self, prescription_data: PrescriptionCreate, prescribed_by_id: UUID) -> PrescriptionResponse:
        """Create new prescription"""
        prescription = Prescription(
            patient_id=prescription_data.patient_id,
            visit_id=prescription_data.visit_id,
            prescribed_by_id=prescribed_by_id,
            medication_name=prescription_data.medication_name,
            dosage=prescription_data.dosage,
            frequency=prescription_data.frequency,
            route=prescription_data.route,
            duration_days=prescription_data.duration_days,
            start_date=prescription_data.start_date,
            end_date=prescription_data.end_date,
            instructions=prescription_data.instructions,
            status="active",
        )

        self.db.add(prescription)
        self.db.commit()
        self.db.refresh(prescription)

        # Auto-log to case sheet if inpatient
        self.case_sheet_logger.log_medication_prescribed(
            visit_id=prescription_data.visit_id,
            prescription_id=prescription.id,
            medication_data={
                "medication_name": prescription.medication_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "route": prescription.route,
                "instructions": prescription.instructions
            },
            prescribed_by_id=prescribed_by_id
        )

        prescriber = self.db.query(User).filter(User.id == prescribed_by_id).first()
        prescriber_name = f"{prescriber.first_name} {prescriber.last_name}" if prescriber else None

        return PrescriptionResponse(
            id=prescription.id,
            patient_id=prescription.patient_id,
            visit_id=prescription.visit_id,
            prescribed_by_id=prescription.prescribed_by_id,
            prescribed_by_name=prescriber_name,
            medication_name=prescription.medication_name,
            dosage=prescription.dosage,
            frequency=prescription.frequency,
            route=prescription.route,
            duration_days=prescription.duration_days,
            start_date=prescription.start_date,
            end_date=prescription.end_date,
            instructions=prescription.instructions,
            status=prescription.status,
            dispensed_at=prescription.dispensed_at,
            dispensed_by_id=prescription.dispensed_by_id,
            administered_at=prescription.administered_at,
            administered_by_id=prescription.administered_by_id,
            created_at=prescription.created_at,
            updated_at=prescription.updated_at,
        )

    def get_patient_prescriptions(self, patient_id: UUID) -> List[PrescriptionResponse]:
        """Get prescriptions for a patient"""
        prescriptions = (
            self.db.query(Prescription)
            .filter(Prescription.patient_id == patient_id)
            .order_by(desc(Prescription.created_at))
            .all()
        )

        result = []
        for prescription in prescriptions:
            prescriber = self.db.query(User).filter(User.id == prescription.prescribed_by_id).first()
            prescriber_name = f"{prescriber.first_name} {prescriber.last_name}" if prescriber else None

            result.append(PrescriptionResponse(
                id=prescription.id,
                patient_id=prescription.patient_id,
                visit_id=prescription.visit_id,
                prescribed_by_id=prescription.prescribed_by_id,
                prescribed_by_name=prescriber_name,
                medication_name=prescription.medication_name,
                dosage=prescription.dosage,
                frequency=prescription.frequency,
                route=prescription.route,
                duration_days=prescription.duration_days,
                start_date=prescription.start_date,
                end_date=prescription.end_date,
                instructions=prescription.instructions,
                status=prescription.status,
                dispensed_at=prescription.dispensed_at,
                dispensed_by_id=prescription.dispensed_by_id,
                administered_at=prescription.administered_at,
                administered_by_id=prescription.administered_by_id,
                created_at=prescription.created_at,
                updated_at=prescription.updated_at,
            ))

        return result

    def get_prescriptions(self, hospital_id: Optional[UUID] = None, status_filter: Optional[str] = None, limit: int = 200) -> List[PrescriptionResponse]:
        """Get prescriptions optionally filtered by hospital and status"""
        # Base query
        query = (
            self.db.query(Prescription)
            .join(Visit, Prescription.visit_id == Visit.id)
        )

        # Apply filters
        if hospital_id:
            query = query.filter(Visit.hospital_id == hospital_id)
        if status_filter:
            query = query.filter(Prescription.status == status_filter)

        prescriptions = query.order_by(desc(Prescription.created_at)).limit(limit).all()

        result = []
        for prescription in prescriptions:
            prescriber = self.db.query(User).filter(User.id == prescription.prescribed_by_id).first()
            prescriber_name = f"{prescriber.first_name} {prescriber.last_name}" if prescriber else None

            result.append(PrescriptionResponse(
                id=prescription.id,
                patient_id=prescription.patient_id,
                visit_id=prescription.visit_id,
                prescribed_by_id=prescription.prescribed_by_id,
                prescribed_by_name=prescriber_name,
                medication_name=prescription.medication_name,
                dosage=prescription.dosage,
                frequency=prescription.frequency,
                route=prescription.route,
                duration_days=prescription.duration_days,
                start_date=prescription.start_date,
                end_date=prescription.end_date,
                instructions=prescription.instructions,
                status=prescription.status,
                dispensed_at=prescription.dispensed_at,
                dispensed_by_id=prescription.dispensed_by_id,
                administered_at=prescription.administered_at,
                administered_by_id=prescription.administered_by_id,
                created_at=prescription.created_at,
                updated_at=prescription.updated_at,
            ))

        return result

    def administer_medication(self, prescription_id: UUID, administered_by_id: UUID, admin_data: PrescriptionAdminister = None) -> PrescriptionResponse:
        """Mark medication as administered with nurse acknowledgment"""
        prescription = self.db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not prescription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

        prescription.administered_at = datetime.utcnow()
        prescription.administered_by_id = administered_by_id
        
        # Add nurse acknowledgment fields
        if admin_data:
            prescription.administration_notes = admin_data.administration_notes
            prescription.administration_confirmed = admin_data.administration_confirmed

        self.db.commit()
        self.db.refresh(prescription)

        # Auto-log to case sheet if inpatient
        self.case_sheet_logger.log_medication_administered(
            visit_id=prescription.visit_id,
            prescription_id=prescription.id,
            administered_by_id=administered_by_id,
            administration_notes=admin_data.administration_notes if admin_data else None
        )

        prescriber = self.db.query(User).filter(User.id == prescription.prescribed_by_id).first()
        prescriber_name = f"{prescriber.first_name} {prescriber.last_name}" if prescriber else None
        
        administrator = self.db.query(User).filter(User.id == administered_by_id).first()
        administrator_name = f"{administrator.first_name} {administrator.last_name}" if administrator else None

        return PrescriptionResponse(
            id=prescription.id,
            patient_id=prescription.patient_id,
            visit_id=prescription.visit_id,
            prescribed_by_id=prescription.prescribed_by_id,
            prescribed_by_name=prescriber_name,
            medication_name=prescription.medication_name,
            dosage=prescription.dosage,
            frequency=prescription.frequency,
            route=prescription.route,
            duration_days=prescription.duration_days,
            start_date=prescription.start_date,
            end_date=prescription.end_date,
            instructions=prescription.instructions,
            status=prescription.status,
            dispensed_at=prescription.dispensed_at,
            dispensed_by_id=prescription.dispensed_by_id,
            administered_at=prescription.administered_at,
            administered_by_id=prescription.administered_by_id,
            administered_by_name=administrator_name,
            administration_notes=prescription.administration_notes,
            administration_confirmed=prescription.administration_confirmed,
            created_at=prescription.created_at,
            updated_at=prescription.updated_at,
        )

    # ========== Nurse Log Operations ==========
    def create_nurse_log(self, log_data: NurseLogCreate, nurse_id: UUID) -> NurseLogResponse:
        """Create nurse log entry"""
        nurse_log = NurseLog(
            patient_id=log_data.patient_id,
            visit_id=log_data.visit_id,
            nurse_id=nurse_id,
            log_type=log_data.log_type,
            content=log_data.content,
            logged_at=log_data.logged_at or datetime.utcnow(),
        )

        self.db.add(nurse_log)
        self.db.commit()
        self.db.refresh(nurse_log)

        nurse = self.db.query(User).filter(User.id == nurse_id).first()
        nurse_name = f"{nurse.first_name} {nurse.last_name}" if nurse else None

        return NurseLogResponse(
            id=nurse_log.id,
            patient_id=nurse_log.patient_id,
            visit_id=nurse_log.visit_id,
            nurse_id=nurse_log.nurse_id,
            nurse_name=nurse_name,
            log_type=nurse_log.log_type,
            content=nurse_log.content,
            logged_at=nurse_log.logged_at,
            created_at=nurse_log.created_at,
        )

    def get_patient_nurse_logs(self, patient_id: UUID, limit: int = 50) -> List[NurseLogResponse]:
        """Get nurse logs for a patient"""
        logs = (
            self.db.query(NurseLog)
            .filter(NurseLog.patient_id == patient_id)
            .order_by(desc(NurseLog.logged_at))
            .limit(limit)
            .all()
        )

        result = []
        for log in logs:
            nurse = self.db.query(User).filter(User.id == log.nurse_id).first()
            nurse_name = f"{nurse.first_name} {nurse.last_name}" if nurse else None

            result.append(NurseLogResponse(
                id=log.id,
                patient_id=log.patient_id,
                visit_id=log.visit_id,
                nurse_id=log.nurse_id,
                nurse_name=nurse_name,
                log_type=log.log_type,
                content=log.content,
                logged_at=log.logged_at,
                created_at=log.created_at,
            ))

        return result

    # ========== Lab Test Operations ==========
    def create_lab_test(self, test_data: LabTestCreate, requested_by_id: UUID) -> LabTestResponse:
        """Create lab test request"""
        lab_test = LabTest(
            patient_id=test_data.patient_id,
            visit_id=test_data.visit_id,
            requested_by_id=requested_by_id,
            test_type=test_data.test_type,
            urgency=test_data.urgency,
            notes=test_data.notes,
            status="pending",
        )

        self.db.add(lab_test)
        self.db.commit()
        self.db.refresh(lab_test)

        requester = self.db.query(User).filter(User.id == requested_by_id).first()
        requester_name = f"{requester.first_name} {requester.last_name}" if requester else None

        return LabTestResponse(
            id=lab_test.id,
            patient_id=lab_test.patient_id,
            visit_id=lab_test.visit_id,
            requested_by_id=lab_test.requested_by_id,
            requested_by_name=requester_name,
            assigned_to_id=lab_test.assigned_to_id,
            test_type=lab_test.test_type,
            urgency=lab_test.urgency,
            status=lab_test.status,
            requested_at=lab_test.requested_at,
            accepted_at=lab_test.accepted_at,
            completed_at=lab_test.completed_at,
            result_file_url=lab_test.result_file_url,
            result_summary=lab_test.result_summary,
            notes=lab_test.notes,
            created_at=lab_test.created_at,
            updated_at=lab_test.updated_at,
        )

    def get_patient_lab_tests(self, patient_id: UUID) -> List[LabTestResponse]:
        """Get lab tests for a patient"""
        tests = (
            self.db.query(LabTest)
            .filter(LabTest.patient_id == patient_id)
            .order_by(desc(LabTest.requested_at))
            .all()
        )

        result = []
        for test in tests:
            requester = self.db.query(User).filter(User.id == test.requested_by_id).first()
            requester_name = f"{requester.first_name} {requester.last_name}" if requester else None

            result.append(LabTestResponse(
                id=test.id,
                patient_id=test.patient_id,
                visit_id=test.visit_id,
                requested_by_id=test.requested_by_id,
                requested_by_name=requester_name,
                assigned_to_id=test.assigned_to_id,
                test_type=test.test_type,
                urgency=test.urgency,
                status=test.status,
                requested_at=test.requested_at,
                accepted_at=test.accepted_at,
                completed_at=test.completed_at,
                result_file_url=test.result_file_url,
                result_summary=test.result_summary,
                notes=test.notes,
                created_at=test.created_at,
                updated_at=test.updated_at,
            ))

        return result
