"""
Lab coordination tasks
"""
import logging
from uuid import UUID
from celery import Task
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.lab_test import LabTest
from app.models.notification import Notification

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


@celery_app.task(bind=True, base=DatabaseTask, max_retries=3)
def lab_coordination(self, test_request_id: str):
    """
    Coordinate lab test workflow
    
    Steps:
    1. Update test status
    2. Notify lab tech
    3. Notify requesting doctor
    4. Notify patient (if appropriate)
    """
    try:
        logger.info(f"Coordinating lab test {test_request_id}")
        
        test_uuid = UUID(test_request_id)
        
        # Fetch lab test
        lab_test = self.db.query(LabTest)\
            .filter(LabTest.id == test_uuid)\
            .first()
        
        if not lab_test:
            logger.error(f"Lab test {test_request_id} not found")
            return {"status": "error", "message": "Lab test not found"}
        
        # Send notifications based on urgency and status
        notifications_sent = []
        
        # If STAT or urgent and pending, notify lab tech immediately
        if lab_test.urgency in ["stat", "urgent"] and lab_test.status == "pending":
            notification = Notification(
                recipient_user_id=None,  # Would be assigned to lab tech
                notification_type="lab_urgent",
                channel="email",
                recipient_address="labtech@hospital.com",
                subject=f"{lab_test.urgency.upper()} Lab Test Request",
                message=f"""
URGENT: New {lab_test.urgency.upper()} lab test requested

Test Type: {lab_test.test_type}
Patient: {lab_test.patient.first_name} {lab_test.patient.last_name} (MRN: {lab_test.patient.mrn})
Requested by: {lab_test.requested_by.first_name} {lab_test.requested_by.last_name}
Requested at: {lab_test.requested_at.strftime('%Y-%m-%d %H:%M')}

Please process immediately.
                """.strip(),
                status="pending"
            )
            self.db.add(notification)
            notifications_sent.append("lab_tech")
        
        # If completed, notify requesting doctor
        if lab_test.status == "completed":
            notification = Notification(
                recipient_user_id=lab_test.requested_by_id,
                notification_type="lab_result",
                channel="email",
                recipient_address=lab_test.requested_by.email,
                subject=f"Lab Results Available - {lab_test.test_type}",
                message=f"""
Lab test results are now available:

Test Type: {lab_test.test_type}
Patient: {lab_test.patient.first_name} {lab_test.patient.last_name} (MRN: {lab_test.patient.mrn})
Completed at: {lab_test.completed_at.strftime('%Y-%m-%d %H:%M')}

Please review the results in the patient dashboard.
                """.strip(),
                status="pending"
            )
            self.db.add(notification)
            notifications_sent.append("doctor")
            
            # Notify patient if appropriate
            if lab_test.patient.email:
                patient_notification = Notification(
                    recipient_user_id=lab_test.patient.user_id,
                    notification_type="lab_result",
                    channel="email",
                    recipient_address=lab_test.patient.email,
                    subject="Lab Test Results Available",
                    message=f"""
Dear {lab_test.patient.first_name},

Your lab test results are now available. Please log into the patient portal to view your results, or contact your doctor for details.

Test Type: {lab_test.test_type}
Completed: {lab_test.completed_at.strftime('%Y-%m-%d %H:%M')}

Thank you.
                    """.strip(),
                    status="pending"
                )
                self.db.add(patient_notification)
                notifications_sent.append("patient")
        
        self.db.commit()
        
        logger.info(f"Lab coordination complete for {test_request_id}. Sent {len(notifications_sent)} notifications.")
        
        return {
            "status": "success",
            "test_id": test_request_id,
            "notifications_sent": notifications_sent
        }
        
    except Exception as e:
        logger.error(f"Error in lab coordination for {test_request_id}: {str(e)}")
        raise self.retry(exc=e)
