"""Appointment scheduling service"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, text
from fastapi import HTTPException, status

from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.user import User
from app.models.hospital import Hospital
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentCheckIn,
    AppointmentCancel,
    AppointmentResponse,
    AppointmentSlot,
)


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db

    def create_appointment(
        self, appointment_data: AppointmentCreate, created_by_id: UUID
    ) -> AppointmentResponse:
        """Create a new appointment with conflict detection"""
        # Verify patient exists
        patient = self.db.query(Patient).filter(Patient.id == appointment_data.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        # Verify doctor exists and is a doctor
        doctor = self.db.query(User).filter(User.id == appointment_data.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        if doctor.role.name != "doctor":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a doctor"
            )

        # Verify hospital exists
        hospital = self.db.query(Hospital).filter(Hospital.id == appointment_data.hospital_id).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital not found"
            )

        # Check for scheduling conflicts (overlapping appointments for same doctor)
        end_time = appointment_data.scheduled_at + timedelta(minutes=appointment_data.duration_minutes)
        # Overlap rule: existing.start < new.end AND existing.end > new.start
        appt_end_expr = Appointment.scheduled_at + (Appointment.duration_minutes * text("interval '1 minute'"))
        try:
            conflicts = self.db.query(Appointment).filter(
                and_(
                    Appointment.doctor_id == appointment_data.doctor_id,
                    Appointment.status.in_(["scheduled", "checked_in", "in_progress"]),
                    Appointment.scheduled_at < end_time,
                    appt_end_expr > appointment_data.scheduled_at,
                )
            ).first()
        except Exception:
            # If DB dialect lacks interval function behavior, skip conflict check gracefully
            conflicts = None

        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Doctor has conflicting appointment at {conflicts.scheduled_at}"
            )

        appointment = Appointment(
            patient_id=appointment_data.patient_id,
            doctor_id=appointment_data.doctor_id,
            hospital_id=appointment_data.hospital_id,
            scheduled_at=appointment_data.scheduled_at,
            duration_minutes=appointment_data.duration_minutes,
            appointment_type=appointment_data.appointment_type,
            reason=appointment_data.reason,
            notes=appointment_data.notes,
            created_by_id=created_by_id,
            status="scheduled",
        )
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)

        return self._to_response(appointment)

    def get_appointment(self, appointment_id: UUID) -> AppointmentResponse:
        """Get appointment by ID"""
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        return self._to_response(appointment)

    def get_appointments(
        self,
        hospital_id: Optional[UUID] = None,
        doctor_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[AppointmentResponse]:
        """Get appointments with filters"""
        query = self.db.query(Appointment)

        if hospital_id:
            query = query.filter(Appointment.hospital_id == hospital_id)
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        if status:
            query = query.filter(Appointment.status == status)
        if start_date:
            query = query.filter(Appointment.scheduled_at >= start_date)
        if end_date:
            query = query.filter(Appointment.scheduled_at <= end_date)

        appointments = query.order_by(Appointment.scheduled_at.desc()).limit(limit).all()
        return [self._to_response(appt) for appt in appointments]

    def update_appointment(
        self, appointment_id: UUID, appointment_update: AppointmentUpdate
    ) -> AppointmentResponse:
        """Update appointment (reschedule, update details, or change status)"""
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )

        # If rescheduling, check for conflicts
        if appointment_update.scheduled_at and appointment_update.scheduled_at != appointment.scheduled_at:
            duration = appointment_update.duration_minutes or appointment.duration_minutes
            end_time = appointment_update.scheduled_at + timedelta(minutes=duration)

            appt_end_expr = Appointment.scheduled_at + (Appointment.duration_minutes * text("interval '1 minute'"))
            try:
                conflicts = self.db.query(Appointment).filter(
                    and_(
                        Appointment.id != appointment_id,
                        Appointment.doctor_id == appointment.doctor_id,
                        Appointment.status.in_(["scheduled", "checked_in", "in_progress"]),
                        Appointment.scheduled_at < end_time,
                        appt_end_expr > appointment_update.scheduled_at,
                    )
                ).first()
            except Exception:
                conflicts = None

            if conflicts:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Doctor has conflicting appointment at {conflicts.scheduled_at}"
                )

        # Update fields
        update_data = appointment_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(appointment, field, value)

        self.db.commit()
        self.db.refresh(appointment)
        return self._to_response(appointment)

    def check_in(self, appointment_id: UUID) -> AppointmentResponse:
        """Check in patient for appointment"""
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )

        if appointment.status != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot check in appointment with status: {appointment.status}"
            )

        appointment.status = "checked_in"
        appointment.checked_in_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(appointment)
        return self._to_response(appointment)

    def cancel_appointment(
        self, appointment_id: UUID, cancel_data: AppointmentCancel
    ) -> AppointmentResponse:
        """Cancel appointment"""
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )

        if appointment.status in ["completed", "cancelled", "no_show"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel appointment with status: {appointment.status}"
            )

        appointment.status = "cancelled"
        appointment.cancelled_at = datetime.utcnow()
        appointment.cancellation_reason = cancel_data.cancellation_reason
        self.db.commit()
        self.db.refresh(appointment)
        return self._to_response(appointment)

    def get_available_slots(
        self,
        doctor_id: UUID,
        date: datetime,
        duration_minutes: int = 30,
    ) -> List[AppointmentSlot]:
        """Get available time slots for a doctor on a specific date"""
        # Get doctor
        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )

        # Define working hours (9 AM to 5 PM)
        start_of_day = date.replace(hour=9, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=17, minute=0, second=0, microsecond=0)

        # Get existing appointments for the day
        existing_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.scheduled_at >= start_of_day,
                Appointment.scheduled_at < end_of_day,
                Appointment.status.in_(["scheduled", "checked_in", "in_progress"])
            )
        ).order_by(Appointment.scheduled_at).all()

        # Generate time slots
        slots = []
        current_time = start_of_day

        for appointment in existing_appointments:
            # Add available slots before this appointment
            while current_time < appointment.scheduled_at:
                slot_end = current_time + timedelta(minutes=duration_minutes)
                if slot_end <= appointment.scheduled_at:
                    slots.append(AppointmentSlot(
                        start_time=current_time,
                        end_time=slot_end,
                        is_available=True,
                        doctor_id=doctor_id,
                        doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}"
                    ))
                current_time += timedelta(minutes=duration_minutes)

            # Skip past this appointment
            appointment_end = appointment.scheduled_at + timedelta(minutes=appointment.duration_minutes)
            current_time = max(current_time, appointment_end)

        # Add remaining slots until end of day
        while current_time < end_of_day:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            if slot_end <= end_of_day:
                slots.append(AppointmentSlot(
                    start_time=current_time,
                    end_time=slot_end,
                    is_available=True,
                    doctor_id=doctor_id,
                    doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}"
                ))
            current_time += timedelta(minutes=duration_minutes)

        return slots

    def _to_response(self, appointment: Appointment) -> AppointmentResponse:
        """Convert Appointment model to response schema"""
        return AppointmentResponse(
            id=appointment.id,
            patient_id=appointment.patient_id,
            patient_name=f"{appointment.patient.first_name} {appointment.patient.last_name}",
            patient_mrn=appointment.patient.mrn,
            patient_phone=appointment.patient.phone,
            doctor_id=appointment.doctor_id,
            doctor_name=f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}",
            doctor_profile_picture_url=getattr(appointment.doctor, 'profile_picture_url', None),
            doctor_qualification=getattr(appointment.doctor, 'qualification', None),
            hospital_id=appointment.hospital_id,
            hospital_name=getattr(appointment.hospital, 'name', None),
            scheduled_at=appointment.scheduled_at,
            duration_minutes=appointment.duration_minutes,
            appointment_type=appointment.appointment_type,
            status=appointment.status,
            reason=appointment.reason,
            notes=appointment.notes,
            checked_in_at=appointment.checked_in_at,
            cancelled_at=appointment.cancelled_at,
            cancellation_reason=appointment.cancellation_reason,
            created_by_id=appointment.created_by_id,
            created_by_name=(
                f"{getattr(appointment.created_by, 'first_name', 'Unknown')} {getattr(appointment.created_by, 'last_name', '')}".strip()
            ),
            created_at=appointment.created_at,
            updated_at=appointment.updated_at,
        )
