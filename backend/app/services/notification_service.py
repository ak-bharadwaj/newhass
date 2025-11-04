"""
Notification service for sending alerts via multiple channels
Supports in-app notifications, email, and push notifications (mobile)
All important events send notifications via ALL channels
Notifications are SENT IMMEDIATELY even when website is closed
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from app.models.push_subscription import PushSubscription
from datetime import datetime
from uuid import UUID
import logging
import os

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing notifications"""

    def __init__(self, db: Session):
        self.db = db
        self.dev_mode = os.getenv("DEV_MODE", "true").lower() == "true"

    def _trigger_immediate_send(self, notification_ids: list[UUID]):
        """
        Trigger immediate sending of notifications via Celery
        This ensures notifications are sent right away, even if website is closed
        """
        try:
            # Import here to avoid circular dependency
            from app.tasks.send_notifications import send_notification_immediately

            # Trigger async sending for each notification
            for notification_id in notification_ids:
                send_notification_immediately.delay(str(notification_id))

            logger.info(f"Triggered immediate sending for {len(notification_ids)} notifications")

        except Exception as e:
            logger.error(f"Failed to trigger immediate notification sending: {e}")
            # Don't raise - notifications are still in DB and will be picked up by periodic task

    def _create_multi_channel_notifications(
        self,
        user: User,
        notification_type: str,
        subject: str,
        message: str,
        metadata: dict = None
    ) -> list[UUID]:
        """
        Create notifications across ALL channels for a user:
        1. In-app (for immediate web display)
        2. Email (for external notification)
        3. Push (for mobile - works even when app is closed)
        
        Notifications are SENT IMMEDIATELY via Celery tasks.
        
        Returns list of created notification IDs
        """
        notification_ids = []
        
        if not user or not user.email:
            return notification_ids
        
        # 1. Create in-app notification (web app pop-up)
        in_app_notification = Notification(
            recipient_user_id=user.id,
            notification_type=notification_type,
            channel="in_app",
            recipient_address=str(user.id),
            subject=subject,
            message=message,
            status="pending",
        )
        self.db.add(in_app_notification)
        self.db.flush()
        notification_ids.append(in_app_notification.id)
        
        # 2. Create email notification
        email_notification = Notification(
            recipient_user_id=user.id,
            notification_type=notification_type,
            channel="email",
            recipient_address=user.email,
            subject=subject,
            message=message,
            status="pending",
        )
        self.db.add(email_notification)
        self.db.flush()
        notification_ids.append(email_notification.id)
        
        # 3. Create push notifications for all subscribed devices
        push_subscriptions = (
            self.db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user.id,
                PushSubscription.is_active == True
            )
            .all()
        )
        
        for subscription in push_subscriptions:
            push_notification = Notification(
                recipient_user_id=user.id,
                notification_type=notification_type,
                channel="push",
                recipient_address=str(subscription.subscription_data),  # Full subscription JSON
                subject=subject,
                message=message,
                status="pending",
            )
            self.db.add(push_notification)
            self.db.flush()
            notification_ids.append(push_notification.id)
        
        # Commit to database
        self.db.commit()
        
        # IMPORTANT: Trigger immediate sending via Celery
        # This ensures notifications are sent RIGHT NOW, even if website is closed
        self._trigger_immediate_send(notification_ids)
        
        return notification_ids

    def notify_patient_assigned(
        self,
        patient_id: UUID,
        patient_name: str,
        assigned_to_id: UUID,
        assigned_to_type: str,  # "doctor" or "nurse"
        visit_id: UUID
    ) -> list[UUID]:
        """
        Notify healthcare provider when patient is assigned to them
        
        Args:
            patient_id: Patient UUID
            patient_name: Patient name
            assigned_to_id: Doctor or nurse UUID
            assigned_to_type: "doctor" or "nurse"
            visit_id: Visit UUID
        
        Returns:
            List of notification IDs
        """
        notification_ids = []
        
        provider = self.db.query(User).filter(User.id == assigned_to_id).first()
        if not provider:
            return notification_ids
        
        role_title = "Dr." if assigned_to_type == "doctor" else "Nurse"
        subject = f"New Patient Assigned: {patient_name}"
        message = f"""
{role_title} {provider.last_name},

You have been assigned a new patient:

Patient: {patient_name}
Patient ID: {patient_id}
Visit ID: {visit_id}
Assigned: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')}

Please review the patient's information and begin care.

Access the patient dashboard to view details.
        """.strip()
        
        ids = self._create_multi_channel_notifications(
            provider,
            "patient_assigned",
            subject,
            message,
            {"patient_id": str(patient_id), "visit_id": str(visit_id)}
        )
        notification_ids.extend(ids)
        
        self.db.commit()
        logger.info(f"Created {len(notification_ids)} notifications for patient assignment")
        
        return notification_ids

    def notify_visit_status_change(
        self,
        visit_id: UUID,
        patient_name: str,
        old_status: str,
        new_status: str,
        doctor_id: UUID,
        nurse_id: UUID = None
    ) -> list[UUID]:
        """
        Notify providers when visit status changes
        """
        notification_ids = []
        
        subject = f"Visit Status Updated: {patient_name}"
        message = f"""
Visit status has been updated:

Patient: {patient_name}
Previous Status: {old_status}
New Status: {new_status}
Visit ID: {visit_id}

Please review the updated status and take necessary actions.
        """.strip()
        
        # Notify doctor
        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if doctor:
            ids = self._create_multi_channel_notifications(
                doctor,
                "visit_status_change",
                subject,
                message
            )
            notification_ids.extend(ids)
        
        # Notify nurse if assigned
        if nurse_id:
            nurse = self.db.query(User).filter(User.id == nurse_id).first()
            if nurse:
                ids = self._create_multi_channel_notifications(
                    nurse,
                    "visit_status_change",
                    subject,
                    message
                )
                notification_ids.extend(ids)
        
        self.db.commit()
        logger.info(f"Created {len(notification_ids)} notifications for visit status change")
        
        return notification_ids

    def notify_prescription_created(
        self,
        prescription_id: UUID,
        patient_name: str,
        medication_name: str,
        doctor_id: UUID,
        nurse_id: UUID = None,
        pharmacist_id: UUID = None
    ) -> list[UUID]:
        """
        Notify staff when new prescription is created
        """
        notification_ids = []
        
        # Notify nurse
        if nurse_id:
            nurse = self.db.query(User).filter(User.id == nurse_id).first()
            if nurse:
                subject = f"New Prescription: {patient_name}"
                message = f"""
New prescription has been created:

Patient: {patient_name}
Medication: {medication_name}
Prescribed by: Dr. (check system)
Prescription ID: {prescription_id}

Please administer medication as prescribed.
                """.strip()
                
                ids = self._create_multi_channel_notifications(
                    nurse,
                    "prescription_created",
                    subject,
                    message
                )
                notification_ids.extend(ids)
        
        # Notify pharmacist
        if pharmacist_id:
            pharmacist = self.db.query(User).filter(User.id == pharmacist_id).first()
            if pharmacist:
                subject = f"New Prescription to Dispense: {patient_name}"
                message = f"""
New prescription ready for dispensing:

Patient: {patient_name}
Medication: {medication_name}
Prescription ID: {prescription_id}

Please prepare medication for dispensing.
                """.strip()
                
                ids = self._create_multi_channel_notifications(
                    pharmacist,
                    "prescription_created",
                    subject,
                    message
                )
                notification_ids.extend(ids)
        
        self.db.commit()
        logger.info(f"Created {len(notification_ids)} notifications for new prescription")
        
        return notification_ids

    def notify_vitals_recorded(
        self,
        patient_id: UUID,
        patient_name: str,
        vital_summary: str,
        doctor_id: UUID
    ) -> list[UUID]:
        """
        Notify doctor when vitals are recorded
        """
        notification_ids = []
        
        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if not doctor:
            return notification_ids
        
        subject = f"Vitals Recorded: {patient_name}"
        message = f"""
New vital signs have been recorded:

Patient: {patient_name}
{vital_summary}
Patient ID: {patient_id}

Review vitals in the patient dashboard.
        """.strip()
        
        ids = self._create_multi_channel_notifications(
            doctor,
            "vitals_recorded",
            subject,
            message
        )
        notification_ids.extend(ids)
        
        self.db.commit()
        logger.info(f"Created {len(notification_ids)} notifications for vitals recorded")
        
        return notification_ids

    def notify_discharge_complete(
        self,
        visit_id: UUID,
        patient_name: str,
        hospital_name: str
    ) -> list[UUID]:
        """
        Send discharge completion notifications to admins
        Uses multi-channel notifications (in-app + email + push)
        """
        notification_ids = []

        # Get super admins and regional admins
        admins = (
            self.db.query(User)
            .join(User.role)
            .filter(User.role.has(name__in=["super_admin", "regional_admin"]))
            .filter(User.is_active == True)
            .all()
        )

        subject = f"Patient Discharge Complete - {hospital_name}"
        message = f"""
Dear Admin,

Patient discharge has been completed and EMR synchronized:

Patient: {patient_name}
Hospital: {hospital_name}
Visit ID: {visit_id}

The discharge summary has been generated and uploaded to the system.
Global EMR has been updated with visit records.

Best regards,
Hospital Automation System
        """.strip()

        for admin in admins:
            ids = self._create_multi_channel_notifications(
                admin,
                "discharge_complete",
                subject,
                message
            )
            notification_ids.extend(ids)

        self.db.commit()

        logger.info(f"Created {len(notification_ids)} notifications (all channels) for discharge {visit_id}")

        return notification_ids

    def notify_lab_result_ready(
        self,
        test_id: UUID,
        patient_name: str,
        test_type: str,
        doctor_id: UUID,
        patient_id: UUID
    ) -> list[UUID]:
        """
        Notify doctor and patient that lab results are ready
        Uses multi-channel notifications (in-app + email + push)
        """
        notification_ids = []

        # Notify doctor
        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if doctor:
            doctor_subject = f"Lab Result Ready - {patient_name}"
            doctor_message = f"""
Dr. {doctor.last_name},

Lab test results are now available:

Patient: {patient_name}
Test Type: {test_type}
Test ID: {test_id}

Please review the results in the system immediately.

Best regards,
Lab Department
            """.strip()
            
            ids = self._create_multi_channel_notifications(
                doctor,
                "lab_result_ready",
                doctor_subject,
                doctor_message
            )
            notification_ids.extend(ids)

        # Notify patient (if they have portal access)
        patient = self.db.query(User).filter(User.id == patient_id).first()
        if patient:
            patient_subject = "Your Lab Results Are Ready"
            patient_message = f"""
Dear {patient_name},

Your lab test results ({test_type}) are now available in your patient portal.

Please log in to view your results or contact your healthcare provider.

Best regards,
{patient.hospital.name if hasattr(patient, 'hospital') and patient.hospital else 'Your Healthcare Provider'}
            """.strip()
            
            ids = self._create_multi_channel_notifications(
                patient,
                "lab_result_ready",
                patient_subject,
                patient_message
            )
            notification_ids.extend(ids)

        self.db.commit()

        logger.info(f"Created {len(notification_ids)} notifications for lab result {test_id}")

        return notification_ids

    def notify_emergency_vitals(
        self,
        patient_id: UUID,
        patient_name: str,
        vital_type: str,
        vital_value: str,
        nurse_id: UUID,
        doctor_id: UUID
    ) -> list[UUID]:
        """
        Send URGENT emergency alert for abnormal vitals
        Uses multi-channel notifications (in-app + email + push)
        Priority: IMMEDIATE
        """
        notification_ids = []

        subject = f"🚨 URGENT: Critical Vitals - {patient_name}"
        message = f"""
🚨 EMERGENCY ALERT 🚨

Patient: {patient_name}
Abnormal Vital: {vital_type}
Value: {vital_value}

⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️

Patient ID: {patient_id}
Time: {datetime.utcnow().strftime('%I:%M %p')}

Respond immediately!
        """.strip()

        # Alert nurse
        nurse = self.db.query(User).filter(User.id == nurse_id).first()
        if nurse:
            ids = self._create_multi_channel_notifications(
                nurse,
                "emergency_alert",
                subject,
                message
            )
            notification_ids.extend(ids)

        # Alert doctor
        doctor = self.db.query(User).filter(User.id == doctor_id).first()
        if doctor:
            ids = self._create_multi_channel_notifications(
                doctor,
                "emergency_alert",
                subject,
                message
            )
            notification_ids.extend(ids)

        self.db.commit()

        logger.critical(f"Created {len(notification_ids)} EMERGENCY notifications for patient {patient_id}")

        return notification_ids

    def notify_inventory_low_stock(
        self,
        hospital_id: UUID,
        hospital_name: str,
        items: list[dict]
    ) -> list[UUID]:
        """
        Notify pharmacist and manager when inventory items fall below threshold.
        items: list of { item_name, quantity, unit }
        """
        notification_ids: list[UUID] = []

        # Find pharmacist and manager users for hospital
        from app.models.user import User
        from app.models.role import Role

        recipients = (
            self.db.query(User)
            .join(Role, Role.id == User.role_id)
            .filter(
                User.hospital_id == hospital_id,
                User.is_active == True,
                Role.name.in_(["pharmacist", "manager"]),
            )
            .all()
        )

        if not recipients:
            return notification_ids

        subject = f"Low Stock Alert - {hospital_name}"
        body_lines = ["The following medications are below threshold:"]
        for it in items:
            body_lines.append(f"- {it['item_name']}: {it['quantity']} {it.get('unit','')} remaining")
        message = "\n".join(body_lines)

        for user in recipients:
            ids = self._create_multi_channel_notifications(
                user,
                "inventory_low_stock",
                subject,
                message,
                {"hospital_id": str(hospital_id)}
            )
            notification_ids.extend(ids)

        self.db.commit()
        return notification_ids

    def notify_inventory_expiring(
        self,
        hospital_id: UUID,
        hospital_name: str,
        items: list[dict]
    ) -> list[UUID]:
        """
        Notify pharmacist and manager when medications are expiring soon.
        items: list of { item_name, expiry_date }
        """
        notification_ids: list[UUID] = []

        from app.models.user import User
        from app.models.role import Role

        recipients = (
            self.db.query(User)
            .join(Role, Role.id == User.role_id)
            .filter(
                User.hospital_id == hospital_id,
                User.is_active == True,
                Role.name.in_(["pharmacist", "manager"]),
            )
            .all()
        )

        if not recipients:
            return notification_ids

        subject = f"Medications Expiring Soon - {hospital_name}"
        body_lines = ["The following medications are nearing expiry:"]
        for it in items:
            body_lines.append(f"- {it['item_name']} (expires {it['expiry_date']})")
        message = "\n".join(body_lines)

        for user in recipients:
            ids = self._create_multi_channel_notifications(
                user,
                "inventory_expiring",
                subject,
                message,
                {"hospital_id": str(hospital_id)}
            )
            notification_ids.extend(ids)

        self.db.commit()
        return notification_ids

    def create_appointment_reminder(
        self,
        appointment_id: UUID,
        patient_user_id: UUID,
        patient_email: str,
        patient_name: str,
        appointment_date: datetime,
        doctor_name: str,
        hospital_name: str
    ) -> list[UUID]:
        """
        Create appointment reminder notifications
        Uses multi-channel notifications if patient has portal account
        """
        notification_ids = []
        
        subject = f"Appointment Reminder - {appointment_date.strftime('%B %d, %Y')}"
        message = f"""
Dear {patient_name},

This is a reminder of your upcoming appointment:

Date & Time: {appointment_date.strftime('%A, %B %d, %Y at %I:%M %p')}
Doctor: {doctor_name}
Location: {hospital_name}

Please arrive 15 minutes early for check-in.

If you need to reschedule, please contact us at least 24 hours in advance.

Thank you.
        """.strip()

        # If patient has portal account, send multi-channel
        if patient_user_id:
            patient = self.db.query(User).filter(User.id == patient_user_id).first()
            if patient:
                ids = self._create_multi_channel_notifications(
                    patient,
                    "appointment_reminder",
                    subject,
                    message
                )
                notification_ids.extend(ids)
        else:
            # Patient doesn't have portal - create email-only notification
            email_notification = Notification(
                recipient_user_id=None,
                notification_type="appointment_reminder",
                channel="email",
                recipient_address=patient_email,
                subject=subject,
                message=message,
                status="pending",
            )
            self.db.add(email_notification)
            self.db.flush()
            notification_ids.append(email_notification.id)

        self.db.commit()

        logger.info(f"Created {len(notification_ids)} appointment reminder notifications")

        return notification_ids

    def notify_secure_message(self, recipient_user_id: UUID, thread_id: UUID, preview: str) -> list[UUID]:
        """
        Notify a user that they received a new secure message
        """
        notification_ids: list[UUID] = []
        user = self.db.query(User).filter(User.id == recipient_user_id).first()
        if not user:
            return notification_ids

        subject = "New Secure Message"
        message = f"You have a new message: {preview[:200]}"
        ids = self._create_multi_channel_notifications(
            user,
            "secure_message",
            subject,
            message,
            {"thread_id": str(thread_id)}
        )
        notification_ids.extend(ids)
        self.db.commit()
        return notification_ids
