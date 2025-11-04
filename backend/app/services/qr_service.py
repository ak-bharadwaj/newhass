"""QR Code Generation and Validation Service"""
import qrcode
import json
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import UUID
import secrets
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.appointment import Appointment
from app.core.config import settings


class QRService:
    """Service for QR code generation and validation"""

    def __init__(self, db: Session):
        self.db = db

    def generate_patient_checkin_qr(
        self,
        patient_id: UUID,
        appointment_id: Optional[UUID] = None,
        expires_in_hours: int = 24
    ) -> Dict:
        """
        Generate QR code for patient check-in

        Args:
            patient_id: Patient ID
            appointment_id: Optional appointment ID
            expires_in_hours: How long the QR code is valid

        Returns:
            Dict with QR code data and image
        """
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError("Patient not found")

        # Generate secure token
        token = secrets.token_urlsafe(32)

        # Create QR code data payload
        expiry = datetime.utcnow() + timedelta(hours=expires_in_hours)
        qr_data = {
            "type": "patient_checkin",
            "patient_id": str(patient_id),
            "appointment_id": str(appointment_id) if appointment_id else None,
            "token": token,
            "expires_at": expiry.isoformat(),
            "patient_mrn": patient.mrn,
            "patient_name": f"{patient.first_name} {patient.last_name}"
        }

        # Convert to JSON string
        qr_payload = json.dumps(qr_data)

        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_payload)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return {
            "qr_code_data": qr_payload,
            "qr_code_image": f"data:image/png;base64,{img_str}",
            "token": token,
            "expires_at": expiry.isoformat(),
            "patient": {
                "id": str(patient.id),
                "mrn": patient.mrn,
                "name": f"{patient.first_name} {patient.last_name}"
            }
        }

    def validate_checkin_qr(self, qr_data: str) -> Dict:
        """
        Validate scanned QR code for check-in

        Args:
            qr_data: JSON string from scanned QR code

        Returns:
            Dict with validation result and patient info
        """
        try:
            data = json.loads(qr_data)
        except json.JSONDecodeError:
            return {
                "valid": False,
                "error": "Invalid QR code format"
            }

        # Check QR code type
        if data.get("type") != "patient_checkin":
            return {
                "valid": False,
                "error": "Invalid QR code type"
            }

        # Check expiry
        try:
            expires_at = datetime.fromisoformat(data["expires_at"])
            if datetime.utcnow() > expires_at:
                return {
                    "valid": False,
                    "error": "QR code has expired"
                }
        except (KeyError, ValueError):
            return {
                "valid": False,
                "error": "Invalid expiry date"
            }

        # Validate patient exists
        patient_id = data.get("patient_id")
        if not patient_id:
            return {
                "valid": False,
                "error": "Missing patient ID"
            }

        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return {
                "valid": False,
                "error": "Patient not found"
            }

        # Get appointment if specified
        appointment = None
        appointment_id = data.get("appointment_id")
        if appointment_id:
            appointment = self.db.query(Appointment).filter(
                Appointment.id == appointment_id
            ).first()

        return {
            "valid": True,
            "patient": {
                "id": str(patient.id),
                "mrn": patient.mrn,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "date_of_birth": patient.date_of_birth.isoformat(),
                "phone": patient.phone,
                "email": patient.email
            },
            "appointment": {
                "id": str(appointment.id),
                "appointment_date": appointment.scheduled_at.isoformat(),
                "doctor_id": str(appointment.doctor_id),
                "status": appointment.status
            } if appointment else None,
            "token": data.get("token")
        }

    def generate_appointment_qr(
        self,
        appointment_id: UUID
    ) -> Dict:
        """
        Generate QR code for appointment confirmation

        Args:
            appointment_id: Appointment ID

        Returns:
            Dict with QR code data and image
        """
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()

        if not appointment:
            raise ValueError("Appointment not found")

        patient = appointment.patient
        doctor = appointment.doctor

        # Generate QR code data
        qr_data = {
            "type": "appointment",
            "appointment_id": str(appointment.id),
            "patient_id": str(patient.id),
            "patient_mrn": patient.mrn,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "doctor_name": f"{doctor.first_name} {doctor.last_name}",
            "appointment_date": appointment.scheduled_at.isoformat(),
            "status": appointment.status
        }

        qr_payload = json.dumps(qr_data)

        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_payload)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return {
            "qr_code_data": qr_payload,
            "qr_code_image": f"data:image/png;base64,{img_str}",
            "appointment": {
                "id": str(appointment.id),
                "date": appointment.scheduled_at.isoformat(),
                "patient": f"{patient.first_name} {patient.last_name}",
                "doctor": f"{doctor.first_name} {doctor.last_name}"
            }
        }
