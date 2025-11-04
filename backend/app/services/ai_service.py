"""
AI service for orchestrating AI features and managing drafts
"""
import os
from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.ai.adapter import AIAdapter
from app.ai.dev_adapter import DevAIAdapter
from app.ai.prompts import (
    sanitize_patient_data,
    sanitize_visit_data,
    sanitize_vitals_data,
    sanitize_lab_results,
    sanitize_prescriptions,
    sanitize_nurse_logs
)
from app.models.ai_draft import AIDraft
from app.models.patient import Patient
from app.models.visit import Visit


class AIService:
    """Service for AI operations and draft management"""

    def __init__(self, db: Session):
        self.db = db
        self.adapter = self._get_adapter()

    def _get_adapter(self) -> AIAdapter:
        """
        Get AI adapter based on environment configuration
        Primary: Gemini 2.5 Flash (default)
        Fallback: OpenAI (if AI_MODE=openai)
        Dev: DevAdapter (if AI_MODE=dev or no credentials)
        """
        ai_mode = os.getenv("AI_MODE", "gemini").lower()

        if ai_mode == "gemini":
            try:
                from app.ai.gemini_adapter import GeminiAdapter
                return GeminiAdapter()
            except Exception as e:
                print(f"Failed to initialize Gemini adapter: {e}")
                print("Falling back to DevAdapter")
                return DevAIAdapter()
        elif ai_mode == "openai":
            try:
                from app.ai.openai_adapter import OpenAIAdapter
                return OpenAIAdapter()
            except Exception as e:
                print(f"Failed to initialize OpenAI adapter: {e}")
                print("Falling back to DevAdapter")
                return DevAIAdapter()
        else:
            return DevAIAdapter()

    async def generate_risk_score(
        self,
        patient_id: UUID,
        create_draft: bool = True
    ) -> Dict[str, Any]:
        """
        Generate risk score for patient and optionally create draft

        Args:
            patient_id: Patient UUID
            create_draft: If True, creates AI draft for doctor approval

        Returns:
            Risk score response dict
        """
        # Fetch patient data
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        # Prepare patient data
        patient_data = {
            "age": self._calculate_age(patient.date_of_birth),
            "gender": patient.gender,
            "allergies": patient.allergies
        }

        # Fetch vitals (last 10)
        from app.models.vitals import Vitals
        vitals = self.db.query(Vitals)\
            .filter(Vitals.patient_id == patient_id)\
            .order_by(Vitals.recorded_at.desc())\
            .limit(10)\
            .all()

        vitals_data = [self._vitals_to_dict(v) for v in vitals]

        # Fetch lab results (last 10)
        from app.models.lab_test import LabTest
        labs = self.db.query(LabTest)\
            .filter(LabTest.patient_id == patient_id)\
            .order_by(LabTest.requested_at.desc())\
            .limit(10)\
            .all()

        lab_data = [self._lab_to_dict(l) for l in labs]

        # Sanitize data before sending to AI
        sanitized_patient = sanitize_patient_data(patient_data)
        sanitized_vitals = sanitize_vitals_data(vitals_data)
        sanitized_labs = sanitize_lab_results(lab_data)

        # Generate risk score
        result = await self.adapter.generate_risk_score(
            sanitized_patient,
            sanitized_vitals,
            sanitized_labs
        )

        # Create draft if requested
        if create_draft:
            draft = AIDraft(
                patient_id=patient_id,
                draft_type="risk_score",
                content=result,
                status="pending",
                created_by_system=True
            )
            self.db.add(draft)
            self.db.commit()
            self.db.refresh(draft)

        return result

    async def generate_discharge_summary(
        self,
        visit_id: UUID,
        create_draft: bool = True
    ) -> Dict[str, Any]:
        """
        Generate discharge summary for visit

        Args:
            visit_id: Visit UUID
            create_draft: If True, creates AI draft for doctor approval

        Returns:
            Discharge summary response dict
        """
        # Fetch visit
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise ValueError(f"Visit {visit_id} not found")

        visit_data = {
            "reason_for_visit": visit.reason_for_visit,
            "diagnosis": visit.diagnosis,
            "admission_date": str(visit.admission_date),
            "discharge_date": str(visit.discharge_date) if visit.discharge_date else None
        }

        # Fetch related data
        from app.models.vitals import Vitals
        from app.models.prescription import Prescription
        from app.models.lab_test import LabTest
        from app.models.nurse_log import NurseLog

        vitals = self.db.query(Vitals)\
            .filter(Vitals.visit_id == visit_id)\
            .order_by(Vitals.recorded_at.desc())\
            .all()

        prescriptions = self.db.query(Prescription)\
            .filter(Prescription.visit_id == visit_id)\
            .all()

        labs = self.db.query(LabTest)\
            .filter(LabTest.visit_id == visit_id)\
            .all()

        nurse_logs = self.db.query(NurseLog)\
            .filter(NurseLog.visit_id == visit_id)\
            .order_by(NurseLog.logged_at.desc())\
            .all()

        # Convert to dicts
        vitals_data = [self._vitals_to_dict(v) for v in vitals]
        rx_data = [self._prescription_to_dict(p) for p in prescriptions]
        lab_data = [self._lab_to_dict(l) for l in labs]
        log_data = [self._nurse_log_to_dict(n) for n in nurse_logs]

        # Sanitize
        sanitized_visit = sanitize_visit_data(visit_data)
        sanitized_vitals = sanitize_vitals_data(vitals_data)
        sanitized_rx = sanitize_prescriptions(rx_data)
        sanitized_labs = sanitize_lab_results(lab_data)
        sanitized_logs = sanitize_nurse_logs(log_data)

        # Generate summary
        result = await self.adapter.generate_discharge_summary(
            sanitized_visit,
            sanitized_vitals,
            sanitized_rx,
            sanitized_labs,
            sanitized_logs
        )

        # Create draft
        if create_draft:
            draft = AIDraft(
                patient_id=visit.patient_id,
                visit_id=visit_id,
                draft_type="discharge_summary",
                content=result,
                status="pending",
                created_by_system=True
            )
            self.db.add(draft)
            self.db.commit()
            self.db.refresh(draft)

        return result

    async def generate_treatment_plan(
        self,
        patient_id: UUID,
        symptoms: str,
        create_draft: bool = True
    ) -> Dict[str, Any]:
        """Generate treatment plan suggestions"""

        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        patient_data = {
            "age": self._calculate_age(patient.date_of_birth),
            "gender": patient.gender,
            "allergies": patient.allergies
        }

        # Fetch recent vitals and labs
        from app.models.vitals import Vitals
        from app.models.lab_test import LabTest

        vitals = self.db.query(Vitals)\
            .filter(Vitals.patient_id == patient_id)\
            .order_by(Vitals.recorded_at.desc())\
            .limit(5)\
            .all()

        labs = self.db.query(LabTest)\
            .filter(LabTest.patient_id == patient_id)\
            .order_by(LabTest.requested_at.desc())\
            .limit(5)\
            .all()

        vitals_data = [self._vitals_to_dict(v) for v in vitals]
        lab_data = [self._lab_to_dict(l) for l in labs]

        # Sanitize
        sanitized_patient = sanitize_patient_data(patient_data)
        sanitized_vitals = sanitize_vitals_data(vitals_data)
        sanitized_labs = sanitize_lab_results(lab_data)

        # Generate plan
        result = await self.adapter.generate_treatment_plan(
            sanitized_patient,
            symptoms,
            sanitized_vitals,
            sanitized_labs
        )

        # Create draft
        if create_draft:
            draft = AIDraft(
                patient_id=patient_id,
                draft_type="treatment_plan",
                content=result,
                status="pending",
                created_by_system=True
            )
            self.db.add(draft)
            self.db.commit()
            self.db.refresh(draft)

        return result

    async def detect_vitals_anomaly(
        self,
        patient_id: UUID,
        vitals_ids: Optional[List[UUID]] = None
    ) -> Dict[str, Any]:
        """Detect anomalies in vitals"""

        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        patient_context = {
            "age": self._calculate_age(patient.date_of_birth),
            "gender": patient.gender
        }

        # Fetch vitals
        from app.models.vitals import Vitals

        query = self.db.query(Vitals).filter(Vitals.patient_id == patient_id)

        if vitals_ids:
            query = query.filter(Vitals.id.in_(vitals_ids))
        else:
            query = query.order_by(Vitals.recorded_at.desc()).limit(5)

        vitals = query.all()
        vitals_data = [self._vitals_to_dict(v) for v in vitals]

        # Sanitize
        sanitized_vitals = sanitize_vitals_data(vitals_data)

        # Detect anomalies
        result = await self.adapter.detect_vitals_anomaly(
            sanitized_vitals,
            patient_context
        )

        # Create alert if critical
        if result.get("is_anomalous") and result.get("severity") in ["high", "critical"]:
            draft = AIDraft(
                patient_id=patient_id,
                draft_type="anomaly_alert",
                content=result,
                status="pending",
                created_by_system=True
            )
            self.db.add(draft)
            self.db.commit()

        return result

    def get_pending_drafts(
        self,
        draft_type: Optional[str] = None,
        patient_id: Optional[UUID] = None
    ) -> List[AIDraft]:
        """Get pending AI drafts"""

        query = self.db.query(AIDraft).filter(AIDraft.status == "pending")

        if draft_type:
            query = query.filter(AIDraft.draft_type == draft_type)

        if patient_id:
            query = query.filter(AIDraft.patient_id == patient_id)

        return query.order_by(AIDraft.created_at.desc()).all()

    def approve_draft(
        self,
        draft_id: UUID,
        reviewed_by_id: UUID,
        approval_notes: Optional[str] = None
    ) -> AIDraft:
        """Approve AI draft"""

        draft = self.db.query(AIDraft).filter(AIDraft.id == draft_id).first()
        if not draft:
            raise ValueError(f"Draft {draft_id} not found")

        draft.status = "approved"
        draft.reviewed_by_id = reviewed_by_id
        draft.approval_notes = approval_notes
        from datetime import datetime
        draft.reviewed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(draft)

        return draft

    def reject_draft(
        self,
        draft_id: UUID,
        reviewed_by_id: UUID,
        rejection_reason: str
    ) -> AIDraft:
        """Reject AI draft"""

        draft = self.db.query(AIDraft).filter(AIDraft.id == draft_id).first()
        if not draft:
            raise ValueError(f"Draft {draft_id} not found")

        draft.status = "rejected"
        draft.reviewed_by_id = reviewed_by_id
        draft.approval_notes = rejection_reason
        from datetime import datetime
        draft.reviewed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(draft)

        return draft

    # Helper methods
    def _calculate_age(self, date_of_birth) -> int:
        """Calculate age from date of birth"""
        from datetime import date
        today = date.today()
        return today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))

    def _vitals_to_dict(self, vitals) -> Dict[str, Any]:
        """Convert Vitals model to dict"""
        return {
            "temperature": float(vitals.temperature) if vitals.temperature else None,
            "heart_rate": vitals.heart_rate,
            "blood_pressure_systolic": vitals.blood_pressure_systolic,
            "blood_pressure_diastolic": vitals.blood_pressure_diastolic,
            "respiratory_rate": vitals.respiratory_rate,
            "spo2": vitals.spo2,
            "is_abnormal": vitals.is_abnormal,
            "recorded_at": str(vitals.recorded_at)
        }

    def _lab_to_dict(self, lab) -> Dict[str, Any]:
        """Convert LabTest model to dict"""
        return {
            "test_type": lab.test_type,
            "urgency": lab.urgency,
            "status": lab.status,
            "result_summary": lab.result_summary,
            "requested_at": str(lab.requested_at)
        }

    def _prescription_to_dict(self, rx) -> Dict[str, Any]:
        """Convert Prescription model to dict"""
        return {
            "medication_name": rx.medication_name,
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "route": rx.route,
            "instructions": rx.instructions
        }

    def _nurse_log_to_dict(self, log) -> Dict[str, Any]:
        """Convert NurseLog model to dict"""
        return {
            "log_type": log.log_type,
            "content": log.content,
            "logged_at": str(log.logged_at)
        }
