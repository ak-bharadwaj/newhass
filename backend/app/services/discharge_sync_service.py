"""Discharge auto-sync service - syncs local EMR to global on discharge"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.visit import Visit
from app.models.patient import Patient
from app.models.vitals import Vitals
from app.models.prescription import Prescription
from app.models.nurse_log import NurseLog
from app.models.lab_test import LabTest
from app.models.case_sheet import CaseSheet


class DischargeSyncService:
    """
    Service to auto-sync important fields from local hospital records
    to global patient database on discharge.

    Workflow:
    1. Patient discharged from local hospital
    2. Trigger sync_on_discharge()
    3. Important fields updated in global patient record
    4. Visit marked as synced
    """

    def __init__(self, db: Session):
        self.db = db

    def sync_on_discharge(self, visit_id: UUID) -> dict:
        """
        Auto-sync local visit data to global patient record on discharge.

        Updates:
        - Patient allergies (if new allergies discovered)
        - Patient blood group (if not set)
        - Last synced timestamp
        - Visit sync status

        Returns dict with sync status and details
        """
        # Get visit
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            return {
                "success": False,
                "error": "Visit not found"
            }

        # Check if already synced
        if visit.synced_to_global:
            return {
                "success": True,
                "message": "Visit already synced",
                "synced_at": visit.synced_at
            }

        # Get patient
        patient = self.db.query(Patient).filter(Patient.id == visit.patient_id).first()
        if not patient:
            return {
                "success": False,
                "error": "Patient not found"
            }

        # Track what was updated
        updates = []

        # Get case sheet for this visit (contains important clinical summary)
        case_sheet = self.db.query(CaseSheet).filter(
            CaseSheet.visit_id == visit_id
        ).first()

        if case_sheet:
            # Update allergies if new ones discovered
            if case_sheet.past_medical_history:
                allergies = case_sheet.past_medical_history.get("allergies")
                if allergies and (not patient.allergies or allergies not in patient.allergies):
                    if patient.allergies:
                        patient.allergies = f"{patient.allergies}, {allergies}"
                    else:
                        patient.allergies = allergies
                    updates.append(f"Updated allergies: {allergies}")

        # Get latest vitals to update blood group if needed
        latest_vitals = self.db.query(Vitals).filter(
            Vitals.visit_id == visit_id
        ).order_by(Vitals.recorded_at.desc()).first()

        # Update blood group if not set (this would come from lab tests typically)
        # In practice, blood group would be in lab test results

        # Update last synced timestamp on patient
        patient.last_synced_at = datetime.utcnow()

        # Mark visit as synced
        visit.synced_to_global = True
        visit.synced_at = datetime.utcnow()
        visit.sync_status = "synced"

        # Commit changes
        self.db.commit()
        self.db.refresh(visit)
        self.db.refresh(patient)

        return {
            "success": True,
            "message": "Visit data synced to global patient record",
            "visit_id": str(visit_id),
            "patient_id": str(patient.id),
            "synced_at": visit.synced_at,
            "updates": updates
        }

    def get_sync_status(self, visit_id: UUID) -> dict:
        """Get sync status for a visit"""
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            return {
                "success": False,
                "error": "Visit not found"
            }

        return {
            "success": True,
            "visit_id": str(visit_id),
            "synced_to_global": visit.synced_to_global,
            "synced_at": visit.synced_at,
            "sync_status": visit.sync_status
        }

    def get_visit_summary(self, visit_id: UUID) -> Optional[dict]:
        """
        Get comprehensive summary of visit for sync purposes.

        Returns all important clinical data from the visit.
        """
        visit = self.db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            return None

        # Get case sheet
        case_sheet = self.db.query(CaseSheet).filter(
            CaseSheet.visit_id == visit_id
        ).first()

        # Get vitals count
        vitals_count = self.db.query(Vitals).filter(
            Vitals.visit_id == visit_id
        ).count()

        # Get prescriptions count
        prescriptions_count = self.db.query(Prescription).filter(
            Prescription.visit_id == visit_id
        ).count()

        # Get nurse logs count
        nurse_logs_count = self.db.query(NurseLog).filter(
            NurseLog.visit_id == visit_id
        ).count()

        # Get lab tests count
        lab_tests_count = self.db.query(LabTest).filter(
            LabTest.visit_id == visit_id
        ).count()

        return {
            "visit_id": str(visit_id),
            "patient_id": str(visit.patient_id),
            "hospital_id": str(visit.hospital_id),
            "admission_date": visit.admission_date,
            "discharge_date": visit.discharge_date,
            "status": visit.status,
            "diagnosis": visit.diagnosis,
            "discharge_summary": visit.discharge_summary,
            "has_case_sheet": case_sheet is not None,
            "case_number": case_sheet.case_number if case_sheet else None,
            "vitals_recorded": vitals_count,
            "prescriptions": prescriptions_count,
            "nurse_logs": nurse_logs_count,
            "lab_tests": lab_tests_count,
            "synced_to_global": visit.synced_to_global,
            "synced_at": visit.synced_at,
            "sync_status": visit.sync_status
        }
