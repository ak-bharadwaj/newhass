"""
Discharge automation tasks
"""
import logging
from uuid import UUID
from celery import Task
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.visit import Visit
from app.models.audit_log import AuditLog
from app.services.emr_sync_service import EMRSyncService
from app.services.pdf_service import PDFService
from app.services.notification_service import NotificationService

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


@celery_app.task(bind=True, base=DatabaseTask, max_retries=3, default_retry_delay=60)
def autosync_discharge(self, visit_id: str):
    """
    Automatically sync Local EMR to Global EMR on discharge
    
    Steps:
    1. Fetch visit and verify discharge status
    2. Sync Local EMR → Global EMR (vitals, labs, prescriptions)
    3. Generate discharge PDF case-sheet
    4. Upload PDF to S3
    5. Create audit log
    6. Send notifications to admins
    """
    try:
        logger.info(f"Starting discharge autosync for visit {visit_id}")
        
        # Convert string to UUID
        visit_uuid = UUID(visit_id)
        
        # Fetch visit
        visit = self.db.query(Visit).filter(Visit.id == visit_uuid).first()
        if not visit:
            logger.error(f"Visit {visit_id} not found")
            return {"status": "error", "message": "Visit not found"}
        
        if visit.status != "discharged":
            logger.warning(f"Visit {visit_id} is not discharged, skipping sync")
            return {"status": "skipped", "message": "Visit not discharged"}
        
        if visit.is_synced_to_global:
            logger.info(f"Visit {visit_id} already synced to global EMR")
            return {"status": "skipped", "message": "Already synced"}
        
        # Initialize services
        emr_sync_service = EMRSyncService(self.db)
        pdf_service = PDFService(self.db)
        notification_service = NotificationService(self.db)
        
        # 1. Sync Local EMR → Global EMR
        logger.info(f"Syncing EMR for visit {visit_id}")
        sync_result = emr_sync_service.sync_visit_to_global(visit_uuid)
        
        logger.info(f"Synced {sync_result['records_created']} records to Global EMR")
        
        # 2. Generate discharge PDF case-sheet
        logger.info(f"Generating discharge PDF for visit {visit_id}")
        try:
            pdf_url = pdf_service.generate_discharge_pdf(visit_uuid)
            logger.info(f"Generated PDF: {pdf_url}")
        except Exception as pdf_error:
            logger.error(f"PDF generation failed: {str(pdf_error)}")
            pdf_url = None  # Continue without PDF in dev mode
        
        # 3. Mark visit as synced
        visit.is_synced_to_global = True
        
        # 4. Create audit log
        patient_name = f"{visit.patient.first_name} {visit.patient.last_name}"
        audit_log = AuditLog(
            user_id=None,  # System action
            action="EMR_SYNC",
            resource_type="visit",
            resource_id=visit_uuid,
            after_state={
                "synced_records": sync_result['records_created'],
                "pdf_url": pdf_url,
                "vitals_synced": sync_result.get('vitals_synced', 0),
                "labs_synced": sync_result.get('labs_synced', 0),
                "prescriptions_synced": sync_result.get('prescriptions_synced', 0),
            },
            notes=f"Auto-sync on discharge: {patient_name} - {sync_result['records_created']} records synced"
        )
        self.db.add(audit_log)
        
        self.db.commit()
        
        # 5. Send notifications to admins
        logger.info(f"Sending discharge notifications for visit {visit_id}")
        try:
            notification_ids = notification_service.notify_discharge_complete(
                visit_id=visit_uuid,
                patient_name=patient_name,
                hospital_name=visit.hospital.name
            )
            logger.info(f"Created {len(notification_ids)} notifications")
        except Exception as notif_error:
            logger.error(f"Notification failed: {str(notif_error)}")
            # Continue even if notifications fail
        
        logger.info(f"Successfully completed autosync for visit {visit_id}")
        
        return {
            "status": "success",
            "synced_records": sync_result['records_created'],
            "visit_id": visit_id,
            "pdf_url": pdf_url,
            "patient_name": patient_name
        }
        
    except Exception as e:
        logger.error(f"Error in autosync_discharge for visit {visit_id}: {str(e)}")
        # Retry with exponential backoff
        raise self.retry(exc=e)
