"""Auto-logging service for case sheet events"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.case_sheet import CaseSheet
from app.models.visit import Visit
from app.models.user import User


class CaseSheetLogger:
    """
    Automatically logs events to case sheets for INPATIENT visits.

    Events logged:
    - Vitals recorded and acknowledged
    - Medications prescribed and administered
    - Doctor visits and examinations
    - Procedures performed
    - Lab tests ordered and results received
    """

    def __init__(self, db: Session):
        self.db = db

    def get_case_sheet_for_visit(self, visit_id: UUID) -> Optional[CaseSheet]:
        """Get case sheet for visit, returns None if not inpatient or no case sheet"""
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit or visit.visit_type != "inpatient":
            return None

        case_sheet = self.db.query(CaseSheet).filter(
            CaseSheet.visit_id == visit_id
        ).first()

        return case_sheet

    def log_vital_recorded(
        self,
        visit_id: UUID,
        vital_id: UUID,
        vital_data: dict,
        recorded_by_id: UUID
    ):
        """Log that vitals were recorded"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return  # Not inpatient or no case sheet

        user = self.db.query(User).filter(User.id == recorded_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="vital_recorded",
            event_data={
                "vital_id": str(vital_id),
                "temperature": str(vital_data.get("temperature")) if vital_data.get("temperature") else None,
                "heart_rate": vital_data.get("heart_rate"),
                "blood_pressure": f"{vital_data.get('blood_pressure_systolic')}/{vital_data.get('blood_pressure_diastolic')}" if vital_data.get('blood_pressure_systolic') else None,
                "spo2": vital_data.get("spo2"),
                "notes": vital_data.get("notes")
            },
            user_id=recorded_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_vital_acknowledged(
        self,
        visit_id: UUID,
        vital_id: UUID,
        acknowledged_by_id: UUID,
        acknowledgment_notes: Optional[str] = None
    ):
        """Log that vitals were acknowledged by nurse"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        user = self.db.query(User).filter(User.id == acknowledged_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="vital_acknowledged",
            event_data={
                "vital_id": str(vital_id),
                "acknowledgment_notes": acknowledgment_notes
            },
            user_id=acknowledged_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_medication_prescribed(
        self,
        visit_id: UUID,
        prescription_id: UUID,
        medication_data: dict,
        prescribed_by_id: UUID
    ):
        """Log that medication was prescribed"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        user = self.db.query(User).filter(User.id == prescribed_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="medication_prescribed",
            event_data={
                "prescription_id": str(prescription_id),
                "medication_name": medication_data.get("medication_name"),
                "dosage": medication_data.get("dosage"),
                "frequency": medication_data.get("frequency"),
                "route": medication_data.get("route"),
                "instructions": medication_data.get("instructions")
            },
            user_id=prescribed_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_medication_administered(
        self,
        visit_id: UUID,
        prescription_id: UUID,
        administered_by_id: UUID,
        administration_notes: Optional[str] = None
    ):
        """Log that medication was administered by nurse"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        user = self.db.query(User).filter(User.id == administered_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="medication_administered",
            event_data={
                "prescription_id": str(prescription_id),
                "administration_notes": administration_notes,
                "confirmed": True
            },
            user_id=administered_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_doctor_visit(
        self,
        visit_id: UUID,
        doctor_id: UUID,
        examination_notes: str,
        assessment: Optional[str] = None
    ):
        """Log doctor visit and examination"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if not doctor:
            return

        case_sheet.log_event(
            event_type="doctor_visit",
            event_data={
                "examination_notes": examination_notes,
                "assessment": assessment
            },
            user_id=doctor_id,
            user_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            user_role=doctor.role.name
        )

        self.db.commit()

    def log_procedure(
        self,
        visit_id: UUID,
        procedure_name: str,
        performed_by_id: UUID,
        procedure_notes: Optional[str] = None
    ):
        """Log procedure performed"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        user = self.db.query(User).filter(User.id == performed_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="procedure",
            event_data={
                "procedure_name": procedure_name,
                "notes": procedure_notes
            },
            user_id=performed_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_lab_test_ordered(
        self,
        visit_id: UUID,
        lab_test_id: UUID,
        test_type: str,
        ordered_by_id: UUID
    ):
        """Log lab test ordered"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        user = self.db.query(User).filter(User.id == ordered_by_id).first()
        if not user:
            return

        case_sheet.log_event(
            event_type="lab_test_ordered",
            event_data={
                "lab_test_id": str(lab_test_id),
                "test_type": test_type
            },
            user_id=ordered_by_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role.name
        )

        self.db.commit()

    def log_lab_result_received(
        self,
        visit_id: UUID,
        lab_test_id: UUID,
        test_type: str,
        result_summary: Optional[str] = None
    ):
        """Log lab test results received"""
        case_sheet = self.get_case_sheet_for_visit(visit_id)
        if not case_sheet:
            return

        case_sheet.log_event(
            event_type="lab_result_received",
            event_data={
                "lab_test_id": str(lab_test_id),
                "test_type": test_type,
                "result_summary": result_summary
            },
            user_id=None,
            user_name="Lab System",
            user_role="system"
        )

        self.db.commit()
