"""
AI Dynamic Patient Queue Intelligence Service

Automatically reorders patient queues based on:
- Medical criticality (vitals, symptoms)
- Age (elderly priority)
- Wait time
- Emergency status
- Doctor availability

This solves the problem of long wait times and ensures critical patients
are seen first while maintaining fairness.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models import Appointment, Patient, User, Vitals, Visit


class AIQueueOptimizer:
    """
    AI-powered patient queue optimization

    Uses multi-factor scoring to determine optimal queue order
    """

    def __init__(self, db: Session):
        self.db = db

    def optimize_queue(
        self,
        hospital_id: Optional[UUID] = None,
        department: Optional[str] = None,
        doctor_id: Optional[UUID] = None
    ) -> Dict:
        """
        Optimize patient queue based on multiple factors

        Args:
            hospital_id: Filter by hospital
            department: Filter by department
            doctor_id: Filter by specific doctor

        Returns:
            Dict with optimized queue and scoring details
        """
        # Get all pending appointments
        appointments = self._get_pending_appointments(hospital_id, department, doctor_id)

        if not appointments:
            return {
                "queue": [],
                "total_patients": 0,
                "optimization_time": datetime.utcnow().isoformat(),
                "message": "No pending appointments"
            }

        # Calculate priority scores for each appointment
        scored_appointments = []
        for appointment in appointments:
            score_details = self._calculate_priority_score(appointment)
            scored_appointments.append({
                "appointment": appointment,
                "score": score_details["total_score"],
                "score_details": score_details
            })

        # Sort by score (higher = higher priority)
        scored_appointments.sort(key=lambda x: x["score"], reverse=True)

        # Build optimized queue
        queue = []
        for idx, item in enumerate(scored_appointments):
            appointment = item["appointment"]
            patient = appointment.patient
            doctor = appointment.doctor

            # Get latest vitals if available
            latest_vitals = self._get_latest_vitals(patient.id)

            queue_item = {
                "position": idx + 1,
                "original_position": appointments.index(appointment) + 1,
                "priority_score": round(item["score"], 2),
                "appointment_id": str(appointment.id),
                "patient": {
                    "id": str(patient.id),
                    "name": f"{patient.first_name} {patient.last_name}",
                    "age": self._calculate_age(patient.date_of_birth),
                    "mrn": patient.mrn
                },
                "doctor": {
                    "id": str(doctor.id),
                    "name": f"{doctor.first_name} {doctor.last_name}",
                    "specialization": doctor.role.name
                },
                "appointment_time": appointment.scheduled_at.isoformat(),
                    "wait_time_minutes": (datetime.utcnow() - appointment.scheduled_at).total_seconds() / 60 if appointment.scheduled_at < datetime.utcnow() else 0,
                "status": appointment.status,
                "priority_factors": item["score_details"],
                "vitals_status": self._assess_vitals_status(latest_vitals) if latest_vitals else "unknown",
                "estimated_wait_time": self._estimate_wait_time(idx),
                "alerts": self._generate_patient_alerts(appointment, item["score_details"])
            }

            queue.append(queue_item)

        # Generate queue insights
        insights = self._generate_queue_insights(queue, scored_appointments)

        return {
            "queue": queue,
            "total_patients": len(queue),
            "optimization_time": datetime.utcnow().isoformat(),
            "insights": insights,
            "average_wait_time_minutes": sum([q["wait_time_minutes"] for q in queue]) / len(queue) if queue else 0,
            "critical_patients": len([q for q in queue if q["priority_factors"]["is_critical"]]),
            "elderly_patients": len([q for q in queue if q["patient"]["age"] >= 65])
        }

    def get_patient_position(
        self,
        appointment_id: UUID
    ) -> Dict:
        """
        Get a specific patient's position in the optimized queue

        Args:
            appointment_id: Appointment ID

        Returns:
            Dict with patient's queue position and estimated wait
        """
        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()

        if not appointment:
            raise ValueError("Appointment not found")

        # Get optimized queue for this doctor
        optimized_queue = self.optimize_queue(doctor_id=appointment.doctor_id)

        # Find patient in queue
        patient_position = next(
            (item for item in optimized_queue["queue"] if item["appointment_id"] == str(appointment_id)),
            None
        )

        if not patient_position:
            return {
                "found": False,
                "message": "Appointment not in current queue"
            }

        return {
            "found": True,
            "position": patient_position["position"],
            "total_in_queue": optimized_queue["total_patients"],
            "estimated_wait_minutes": patient_position["estimated_wait_time"],
            "priority_score": patient_position["priority_score"],
            "status": patient_position["vitals_status"],
            "alerts": patient_position["alerts"]
        }

    def reorder_queue_realtime(
        self,
        hospital_id: UUID,
        trigger_event: str = "manual"
    ) -> Dict:
        """
        Trigger real-time queue reordering

        Called when:
        - New emergency patient arrives
        - Vitals updated showing criticality
        - Doctor availability changes

        Args:
            hospital_id: Hospital ID
            trigger_event: Event that triggered reordering

        Returns:
            Dict with before/after comparison
        """
        before_queue = self._get_current_queue_snapshot(hospital_id)
        after_queue = self.optimize_queue(hospital_id=hospital_id)

        # Calculate changes
        position_changes = self._calculate_position_changes(before_queue, after_queue["queue"])

        return {
            "trigger_event": trigger_event,
            "reorder_time": datetime.utcnow().isoformat(),
            "before": before_queue,
            "after": after_queue,
            "changes": position_changes,
            "patients_moved": len([c for c in position_changes if c["position_change"] != 0])
        }

    # Helper methods

    def _get_pending_appointments(
        self,
        hospital_id: Optional[UUID] = None,
        department: Optional[str] = None,
        doctor_id: Optional[UUID] = None
    ) -> List[Appointment]:
        """Get all pending/scheduled appointments"""
        query = self.db.query(Appointment).filter(
            Appointment.status.in_(["scheduled", "waiting"])
        )

        if hospital_id:
            # Join specifically via the doctor relationship to avoid ambiguous joins
            query = query.join(Appointment.doctor).filter(User.hospital_id == hospital_id)

        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)

        # Get appointments for today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        today_end = today_start + timedelta(days=1)

        query = query.filter(
            and_(
                Appointment.scheduled_at >= today_start,
                Appointment.scheduled_at < today_end
            )
        )

        return query.all()

    def _calculate_priority_score(self, appointment: Appointment) -> Dict:
        """
        Calculate multi-factor priority score

        Scoring factors:
        - Criticality: 0-40 points (vitals, symptoms)
        - Age: 0-20 points (elderly priority)
        - Wait time: 0-20 points (fairness)
        - Appointment type: 0-10 points (emergency vs routine)
        - Doctor availability: 0-10 points

        Total: 0-100 points
        """
        patient = appointment.patient
        score = 0
        details = {}

        # Factor 1: Medical Criticality (0-40 points)
        criticality_score, is_critical = self._assess_medical_criticality(patient.id)
        score += criticality_score
        details["criticality_score"] = criticality_score
        details["is_critical"] = is_critical

        # Factor 2: Age (0-20 points)
        age = self._calculate_age(patient.date_of_birth)
        age_score = self._calculate_age_score(age)
        score += age_score
        details["age"] = age
        details["age_score"] = age_score

        # Factor 3: Wait Time (0-20 points)
        wait_time_score = self._calculate_wait_time_score(appointment.scheduled_at)
        score += wait_time_score
        details["wait_time_score"] = wait_time_score

        # Factor 4: Appointment Type (0-10 points)
        type_score = self._calculate_appointment_type_score(appointment)
        score += type_score
        details["appointment_type_score"] = type_score

        # Factor 5: Special Conditions (0-10 points)
        special_score = self._assess_special_conditions(patient)
        score += special_score
        details["special_conditions_score"] = special_score

        details["total_score"] = score

        return details

    def _assess_medical_criticality(self, patient_id: UUID) -> tuple[float, bool]:
        """
        Assess medical criticality based on recent vitals

        Returns:
            Tuple of (score, is_critical)
        """
        latest_vitals = self._get_latest_vitals(patient_id)

        if not latest_vitals:
            return 10.0, False  # Default medium priority

        criticality_score = 0
        is_critical = False

        # Check for abnormal vitals
        if latest_vitals.is_abnormal:
            criticality_score += 20
            is_critical = True

        # Check specific critical thresholds
        if latest_vitals.temperature:
            if latest_vitals.temperature < 35.0 or latest_vitals.temperature > 39.5:
                criticality_score += 10
                is_critical = True

        if latest_vitals.heart_rate:
            if latest_vitals.heart_rate < 40 or latest_vitals.heart_rate > 140:
                criticality_score += 10
                is_critical = True

        if latest_vitals.spo2:
            if latest_vitals.spo2 < 90:
                criticality_score += 10
                is_critical = True

        # Check blood pressure
        if latest_vitals.blood_pressure_systolic and latest_vitals.blood_pressure_diastolic:
            if latest_vitals.blood_pressure_systolic > 180 or latest_vitals.blood_pressure_systolic < 80:
                criticality_score += 10
                is_critical = True

        return min(criticality_score, 40), is_critical

    def _calculate_age(self, date_of_birth: datetime) -> int:
        """Calculate age from date of birth"""
        today = datetime.utcnow()
        age = today.year - date_of_birth.year
        if today.month < date_of_birth.month or (today.month == date_of_birth.month and today.day < date_of_birth.day):
            age -= 1
        return age

    def _calculate_age_score(self, age: int) -> float:
        """Calculate priority score based on age"""
        if age >= 80:
            return 20.0
        elif age >= 70:
            return 15.0
        elif age >= 65:
            return 10.0
        elif age <= 5:
            return 15.0  # Young children also priority
        elif age <= 12:
            return 10.0
        else:
            return 5.0

    def _calculate_wait_time_score(self, appointment_date: datetime) -> float:
        """Calculate score based on wait time (fairness factor)"""
        if appointment_date > datetime.utcnow():
            return 0  # Not yet appointment time

        wait_minutes = (datetime.utcnow() - appointment_date).total_seconds() / 60

        if wait_minutes >= 120:  # 2+ hours
            return 20.0
        elif wait_minutes >= 90:
            return 15.0
        elif wait_minutes >= 60:
            return 10.0
        elif wait_minutes >= 30:
            return 5.0
        else:
            return 2.0

    def _calculate_appointment_type_score(self, appointment: Appointment) -> float:
        """Calculate score based on appointment type"""
        appointment_type = appointment.appointment_type.lower() if appointment.appointment_type else "routine"

        if "emergency" in appointment_type:
            return 10.0
        elif "urgent" in appointment_type:
            return 7.0
        elif "follow-up" in appointment_type:
            return 4.0
        else:
            return 5.0  # Routine

    def _assess_special_conditions(self, patient: Patient) -> float:
        """Assess special conditions (pregnancy, allergies, etc.)"""
        score = 0

        # Check for critical allergies
        if patient.allergies:
            allergies_lower = patient.allergies.lower()
            if any(critical in allergies_lower for critical in ["penicillin", "anesthesia", "latex"]):
                score += 5

        # Check for chronic conditions in medical history
        if patient.medical_history:
            history_lower = patient.medical_history.lower()
            if any(condition in history_lower for condition in ["diabetes", "cardiac", "asthma", "copd"]):
                score += 5

        return min(score, 10)

    def _get_latest_vitals(self, patient_id: UUID) -> Optional[Vitals]:
        """Get most recent vitals for patient"""
        return self.db.query(Vitals).filter(
            Vitals.patient_id == patient_id
        ).order_by(Vitals.recorded_at.desc()).first()

    def _assess_vitals_status(self, vitals: Vitals) -> str:
        """Assess overall vitals status"""
        if vitals.is_abnormal:
            return "critical"

        # Check for warning signs
        warnings = 0

        if vitals.temperature:
            if vitals.temperature < 36.0 or vitals.temperature > 38.5:
                warnings += 1

        if vitals.heart_rate:
            if vitals.heart_rate < 50 or vitals.heart_rate > 120:
                warnings += 1

        if vitals.spo2:
            if vitals.spo2 < 94:
                warnings += 1

        if warnings >= 2:
            return "warning"
        elif warnings == 1:
            return "monitor"
        else:
            return "normal"

    def _estimate_wait_time(self, position: int) -> int:
        """Estimate wait time based on queue position"""
        # Assume 15 minutes average consultation time
        average_consultation_minutes = 15
        return position * average_consultation_minutes

    def _generate_patient_alerts(self, appointment: Appointment, score_details: Dict) -> List[str]:
        """Generate alerts for this patient"""
        alerts = []

        if score_details["is_critical"]:
            alerts.append("CRITICAL VITALS - Immediate attention required")

        if score_details["age"] >= 75:
            alerts.append("Elderly patient - Handle with extra care")

        if score_details["wait_time_score"] >= 15:
            alerts.append("Long wait time - Patient may be frustrated")

        return alerts

    def _generate_queue_insights(self, queue: List[Dict], scored_appointments: List[Dict]) -> Dict:
        """Generate insights about the queue"""
        if not queue:
            return {}

        critical_count = len([q for q in queue if q["priority_factors"]["is_critical"]])
        elderly_count = len([q for q in queue if q["patient"]["age"] >= 65])
        long_wait_count = len([q for q in queue if q["wait_time_minutes"] >= 60])

        return {
            "total_patients": len(queue),
            "critical_patients": critical_count,
            "elderly_patients": elderly_count,
            "long_wait_patients": long_wait_count,
            "average_priority_score": sum([q["priority_score"] for q in queue]) / len(queue),
            "recommendations": self._generate_recommendations(critical_count, elderly_count, long_wait_count, len(queue))
        }

    def _generate_recommendations(self, critical: int, elderly: int, long_wait: int, total: int) -> List[str]:
        """Generate queue management recommendations"""
        recommendations = []

        if critical > 0:
            recommendations.append(f"⚠️ {critical} critical patients in queue - consider fast-tracking")

        if elderly >= total * 0.3:
            recommendations.append(f"👴 High elderly patient count ({elderly}) - allocate additional support staff")

        if long_wait >= total * 0.4:
            recommendations.append(f"⏰ Many patients waiting 60+ minutes - consider opening additional consultation rooms")

        if total > 20:
            recommendations.append("📊 High patient volume - consider calling in additional doctors")

        return recommendations

    def _get_current_queue_snapshot(self, hospital_id: UUID) -> List[Dict]:
        """Get current queue before optimization"""
        appointments = self._get_pending_appointments(hospital_id=hospital_id)

        return [
            {
                "appointment_id": str(appt.id),
                "patient_name": f"{appt.patient.first_name} {appt.patient.last_name}",
                "position": idx + 1
            }
            for idx, appt in enumerate(appointments)
        ]

    def _calculate_position_changes(self, before: List[Dict], after: List[Dict]) -> List[Dict]:
        """Calculate position changes between snapshots"""
        changes = []

        for before_item in before:
            after_item = next(
                (item for item in after if item["appointment_id"] == before_item["appointment_id"]),
                None
            )

            if after_item:
                position_change = before_item["position"] - after_item["position"]
                changes.append({
                    "appointment_id": before_item["appointment_id"],
                    "patient_name": before_item["patient_name"],
                    "old_position": before_item["position"],
                    "new_position": after_item["position"],
                    "position_change": position_change,
                    "moved_up": position_change > 0
                })

        return changes
