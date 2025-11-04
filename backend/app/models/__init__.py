"""Database models package - Import all models for Alembic discovery"""

from app.models.role import Role
from app.models.region import Region
from app.models.hospital import Hospital
from app.models.user import User
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.bed import Bed
from app.models.api_key import ApiKey
from app.models.vitals import Vitals
from app.models.nurse_log import NurseLog
from app.models.lab_test import LabTest
from app.models.prescription import Prescription
from app.models.appointment import Appointment
from app.models.inventory import Inventory
from app.models.emr import EMRLocal, EMRGlobal
from app.models.notification import Notification
from app.models.push_subscription import PushSubscription
from app.models.audit_log import AuditLog
from app.models.ai_draft import AIDraft
from app.models.case_sheet import CaseSheet
from app.models.global_emr import GlobalEMR, LocalVisitRecord
from app.models.patient_hospital import PatientHospital
from app.models.message_thread import MessageThread
from app.models.message import Message

__all__ = [
    "Role",
    "Region",
    "Hospital",
    "User",
    "Patient",
    "Visit",
    "Bed",
    "Vitals",
    "NurseLog",
    "LabTest",
    "Prescription",
    "Appointment",
    "Inventory",
    "EMRLocal",
    "EMRGlobal",
    # Backwards-compatible aliases expected by some tests
    "LocalEMR",
    "Notification",
    "PushSubscription",
    "AuditLog",
    "AIDraft",
    "CaseSheet",
    "GlobalEMR",
    "LocalVisitRecord",
    "PatientHospital",
    "ApiKey",
    "MessageThread",
    "Message",
]

# Backwards-compatible alias: some tests import LocalEMR from app.models
# while the canonical name is EMRLocal. Export an alias to satisfy both.
LocalEMR = EMRLocal

