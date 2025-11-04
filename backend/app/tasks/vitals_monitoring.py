"""
Vitals monitoring scheduled tasks
"""
import logging
from celery import Task
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.vitals import Vitals
from app.models.visit import Visit
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


@celery_app.task(bind=True, base=DatabaseTask)
def monitor_vitals(self):
    """
    Scheduled task to monitor patient vitals for anomalies
    Runs every 5 minutes (configured in celery_app.py)
    """
    try:
        logger.info("Starting vitals monitoring task")
        
        # Get all active visits
        active_visits = self.db.query(Visit)\
            .filter(Visit.status == "active")\
            .all()
        
        logger.info(f"Monitoring {len(active_visits)} active visits")
        
        alerts_generated = 0
        
        for visit in active_visits:
            # Get recent vitals (last 5 minutes)
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
            recent_vitals = self.db.query(Vitals)\
                .filter(
                    Vitals.visit_id == visit.id,
                    Vitals.recorded_at >= five_minutes_ago
                )\
                .order_by(Vitals.recorded_at.desc())\
                .limit(5)\
                .all()
            
            if not recent_vitals:
                continue
            
            # Check latest vital for critical thresholds
            latest_vital = recent_vitals[0]
            anomalies_found = []
            
            # Temperature thresholds (°C)
            if latest_vital.temperature:
                if latest_vital.temperature < 35.0 or latest_vital.temperature > 39.5:
                    anomalies_found.append(f"Temperature: {latest_vital.temperature}°C (Critical)")
            
            # Heart Rate thresholds (bpm)
            if latest_vital.heart_rate:
                if latest_vital.heart_rate < 40 or latest_vital.heart_rate > 140:
                    anomalies_found.append(f"Heart Rate: {latest_vital.heart_rate} bpm (Critical)")
            
            # Blood Pressure thresholds (mmHg)
            if latest_vital.blood_pressure_systolic and latest_vital.blood_pressure_diastolic:
                if latest_vital.blood_pressure_systolic > 180 or latest_vital.blood_pressure_systolic < 80:
                    anomalies_found.append(f"Systolic BP: {latest_vital.blood_pressure_systolic} mmHg (Critical)")
                if latest_vital.blood_pressure_diastolic > 110 or latest_vital.blood_pressure_diastolic < 50:
                    anomalies_found.append(f"Diastolic BP: {latest_vital.blood_pressure_diastolic} mmHg (Critical)")
            
            # SpO2 threshold (%)
            if latest_vital.spo2:
                if latest_vital.spo2 < 90:
                    anomalies_found.append(f"SpO2: {latest_vital.spo2}% (Critical - Low Oxygen)")
            
            # If anomalies found, mark vital and send notifications
            if anomalies_found:
                logger.warning(
                    f"🚨 CRITICAL VITALS for patient {visit.patient.mrn} (Visit {visit.id}): "
                    f"{', '.join(anomalies_found)}"
                )
                
                # Mark vital as abnormal
                if not latest_vital.is_abnormal:
                    latest_vital.is_abnormal = True
                    self.db.commit()
                
                # Send emergency notifications
                notification_service = NotificationService(self.db)
                try:
                    notification_service.notify_emergency_vitals(
                        patient_id=visit.patient_id,
                        patient_name=f"{visit.patient.first_name} {visit.patient.last_name}",
                        vital_type=", ".join([a.split(":")[0] for a in anomalies_found]),
                        vital_value=", ".join(anomalies_found),
                        nurse_id=latest_vital.recorded_by_id,
                        doctor_id=visit.attending_doctor_id if visit.attending_doctor_id else latest_vital.recorded_by_id
                    )
                    alerts_generated += 1
                except Exception as notif_error:
                    logger.error(f"Failed to send emergency notification: {str(notif_error)}")
        
        logger.info(f"Vitals monitoring complete. Generated {alerts_generated} alerts.")
        
        return {
            "status": "success",
            "active_visits": len(active_visits),
            "alerts_generated": alerts_generated
        }
        
    except Exception as e:
        logger.error(f"Error in vitals monitoring task: {str(e)}")
        return {"status": "error", "message": str(e)}
