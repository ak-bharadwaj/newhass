"""
Notification tasks
"""
import logging
from uuid import UUID
from celery import Task
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.appointment import Appointment

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database session"""
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, max_retries=2, default_retry_delay=300)
def send_reminder(self, reminder_id: str):
    """
    Send appointment reminder via configured channel
    
    Args:
        reminder_id: Notification ID to send
    """
    try:
        logger.info(f"Sending reminder notification {reminder_id}")
        
        reminder_uuid = UUID(reminder_id)
        
        # Fetch notification
        notification = self.db.query(Notification)\
            .filter(Notification.id == reminder_uuid)\
            .first()
        
        if not notification:
            logger.error(f"Notification {reminder_id} not found")
            return {"status": "error", "message": "Notification not found"}
        
        if notification.status in ["sent", "delivered"]:
            logger.info(f"Notification {reminder_id} already sent")
            return {"status": "skipped", "message": "Already sent"}
        
        # Dev mode: Just log the notification
        logger.info(f"[DEV MODE] Would send {notification.channel} notification to {notification.recipient_address}")
        logger.info(f"Subject: {notification.subject}")
        logger.info(f"Message: {notification.message}")
        
        # Update notification status
        from datetime import datetime
        notification.status = "sent"
        notification.sent_at = datetime.utcnow()
        
        # In production, this would use actual notification providers
        # For now, mark as delivered immediately
        notification.status = "delivered"
        notification.delivered_at = datetime.utcnow()
        
        self.db.commit()
        
        logger.info(f"Successfully sent reminder {reminder_id}")
        
        return {
            "status": "success",
            "notification_id": reminder_id,
            "channel": notification.channel
        }
        
    except Exception as e:
        logger.error(f"Error sending reminder {reminder_id}: {str(e)}")
        
        # Update failure count
        notification = self.db.query(Notification)\
            .filter(Notification.id == UUID(reminder_id))\
            .first()
        
        if notification:
            notification.retry_count += 1
            
            if notification.retry_count >= notification.max_retries:
                notification.status = "failed"
                from datetime import datetime
                notification.failed_at = datetime.utcnow()
                notification.failure_reason = str(e)
                self.db.commit()
                logger.error(f"Notification {reminder_id} failed after {notification.retry_count} attempts")
                return {"status": "failed", "message": str(e)}
            
            self.db.commit()
        
        raise self.retry(exc=e)


@celery_app.task(bind=True, base=DatabaseTask)
def send_appointment_reminders(self, appointment_id: str):
    """
    Create and send appointment reminders
    
    Args:
        appointment_id: Appointment ID to send reminders for
    """
    try:
        logger.info(f"Creating reminders for appointment {appointment_id}")
        
        appointment_uuid = UUID(appointment_id)
        
        # Fetch appointment with patient and doctor
        appointment = self.db.query(Appointment)\
            .filter(Appointment.id == appointment_uuid)\
            .first()
        
        if not appointment:
            logger.error(f"Appointment {appointment_id} not found")
            return {"status": "error", "message": "Appointment not found"}
        
        # Create notification for patient
        from datetime import datetime
        notification = Notification(
            recipient_user_id=appointment.patient.user_id if appointment.patient.user_id else None,
            notification_type="appointment_reminder",
            channel="email",  # Could be configurable per patient
            recipient_address=appointment.patient.email or "noreply@hospital.com",
            subject=f"Appointment Reminder - {appointment.scheduled_at.strftime('%Y-%m-%d %H:%M')}",
            message=f"""
Dear {appointment.patient.first_name},

This is a reminder for your upcoming appointment:

Date & Time: {appointment.scheduled_at.strftime('%A, %B %d, %Y at %I:%M %p')}
Doctor: {appointment.doctor_name}
Type: {appointment.appointment_type}
Location: {appointment.hospital_name}

Please arrive 15 minutes early for check-in.

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Thank you.
            """.strip(),
            status="pending"
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        # Trigger send task
        send_reminder.delay(str(notification.id))
        
        logger.info(f"Created reminder notification for appointment {appointment_id}")
        
        return {
            "status": "success",
            "appointment_id": appointment_id,
            "notification_id": str(notification.id)
        }
        
    except Exception as e:
        logger.error(f"Error creating reminders for appointment {appointment_id}: {str(e)}")
        return {"status": "error", "message": str(e)}
