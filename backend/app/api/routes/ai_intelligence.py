"""
API Routes for AI Intelligence Features

Exposes:
- Bed & Resource Prediction
- Patient Queue Optimization
- Early Warning System
- AI Notifications
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.services.ai_bed_prediction_service import AIBedPredictionService
from app.services.ai_queue_optimizer import AIQueueOptimizer
from app.services.early_warning_system import EarlyWarningSystem
from app.services.ai_notification_service import AINotificationService


router = APIRouter()


# Bed & Resource Prediction Endpoints

@router.get("/bed-prediction/{hospital_id}")
def predict_bed_occupancy(
    hospital_id: UUID,
    days_ahead: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Predict bed occupancy for the next N days

    Requires: manager, regional_admin, or super_admin role
    """
    if current_user.role.name not in ["manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AIBedPredictionService(db)

    try:
        prediction = service.predict_bed_occupancy(hospital_id, days_ahead)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/icu-prediction/{hospital_id}")
def predict_icu_load(
    hospital_id: UUID,
    days_ahead: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Predict ICU bed requirements for next N days

    Requires: manager, regional_admin, or super_admin role
    """
    if current_user.role.name not in ["manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AIBedPredictionService(db)

    try:
        prediction = service.predict_icu_load(hospital_id, days_ahead)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resource-bottlenecks/{hospital_id}")
def get_resource_bottlenecks(
    hospital_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Identify current and predicted resource bottlenecks

    Requires: manager, regional_admin, or super_admin role
    """
    if current_user.role.name not in ["manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AIBedPredictionService(db)

    try:
        bottlenecks = service.get_resource_bottlenecks(hospital_id)
        return bottlenecks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Patient Queue Optimization Endpoints

@router.get("/queue/optimize")
def optimize_patient_queue(
    hospital_id: Optional[UUID] = None,
    department: Optional[str] = None,
    doctor_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get optimized patient queue based on criticality, age, wait time

    Accessible by: doctor, nurse, reception, manager
    """
    if current_user.role.name not in ["doctor", "nurse", "reception", "manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # If doctor, automatically filter by their ID
    if current_user.role.name == "doctor" and not doctor_id:
        doctor_id = current_user.id

    # If nurse/reception, use their hospital
    if not hospital_id and current_user.hospital_id:
        hospital_id = current_user.hospital_id

    service = AIQueueOptimizer(db)

    try:
        optimized_queue = service.optimize_queue(hospital_id, department, doctor_id)
        return optimized_queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/patient-position/{appointment_id}")
def get_patient_queue_position(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get specific patient's position in optimized queue

    Useful for patient-facing interfaces
    """
    service = AIQueueOptimizer(db)

    try:
        position = service.get_patient_position(appointment_id)
        return position
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queue/reorder/{hospital_id}")
def reorder_queue_realtime(
    hospital_id: UUID,
    trigger_event: str = Query("manual", description="Event that triggered reordering"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger real-time queue reordering

    Called when:
    - New emergency patient arrives
    - Vitals updated showing criticality
    - Doctor availability changes

    Requires: nurse, doctor, reception, manager
    """
    if current_user.role.name not in ["doctor", "nurse", "reception", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AIQueueOptimizer(db)

    try:
        result = service.reorder_queue_realtime(hospital_id, trigger_event)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Early Warning System Endpoints

@router.get("/early-warning/patient/{patient_id}")
def assess_patient_risk(
    patient_id: UUID,
    visit_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Comprehensive risk assessment for a patient

    Detects early signs of:
    - Sepsis
    - Cardiac events
    - Respiratory distress
    - Shock

    Accessible by: doctor, nurse
    """
    if current_user.role.name not in ["doctor", "nurse", "manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = EarlyWarningSystem(db)

    try:
        assessment = service.assess_patient_risk(patient_id, visit_id)
        return assessment
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/early-warning/monitor")
def monitor_all_patients(
    hospital_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Monitor all active patients and identify high-risk cases

    Critical for ICU rounds and ward monitoring

    Requires: doctor, nurse, manager
    """
    if current_user.role.name not in ["doctor", "nurse", "manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Use user's hospital if not specified
    if not hospital_id and current_user.hospital_id:
        hospital_id = current_user.hospital_id

    service = EarlyWarningSystem(db)

    try:
        monitoring_results = service.monitor_all_patients(hospital_id)
        return monitoring_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# AI Notification Endpoints

@router.post("/notifications/appointment-reminder/{appointment_id}")
def send_appointment_reminder(
    appointment_id: UUID,
    hours_before: int = Query(24, ge=1, le=168),
    language: str = Query("en", regex="^(en|es)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send AI-generated appointment reminder

    Uses Gemini AI to create personalized, context-aware reminders

    Sends via: WhatsApp, SMS, Email

    Requires: reception, manager, super_admin
    """
    if current_user.role.name not in ["reception", "manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AINotificationService(db)

    try:
        result = service.send_appointment_reminder(appointment_id, hours_before, language)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/lab-result/{patient_id}")
def send_lab_result_notification(
    patient_id: UUID,
    test_type: str,
    language: str = Query("en", regex="^(en|es)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send notification when lab results are ready

    Requires: lab_tech, doctor, nurse
    """
    if current_user.role.name not in ["lab_tech", "doctor", "nurse", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    service = AINotificationService(db)

    try:
        result = service.send_lab_result_notification(patient_id, test_type, language)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Dashboard Summary Endpoint

@router.get("/intelligence-summary")
def get_intelligence_summary(
    hospital_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive AI intelligence summary for dashboard

    Includes:
    - Bed predictions (next 7 days)
    - High-risk patients (EWS)
    - Queue status
    - Resource bottlenecks

    Perfect for manager dashboard

    Requires: manager, regional_admin, super_admin
    """
    if current_user.role.name not in ["manager", "regional_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Use user's hospital if not specified
    if not hospital_id and current_user.hospital_id:
        hospital_id = current_user.hospital_id

    if not hospital_id:
        raise HTTPException(status_code=400, detail="Hospital ID required")

    try:
        # Gather data from multiple services
        bed_service = AIBedPredictionService(db)
        ews_service = EarlyWarningSystem(db)
        queue_service = AIQueueOptimizer(db)

        bed_prediction = bed_service.predict_bed_occupancy(hospital_id, days_ahead=7)
        icu_prediction = bed_service.predict_icu_load(hospital_id, days_ahead=7)
        bottlenecks = bed_service.get_resource_bottlenecks(hospital_id)
        high_risk_patients = ews_service.monitor_all_patients(hospital_id)
        queue_status = queue_service.optimize_queue(hospital_id=hospital_id)

        # Compile summary
        return {
            "hospital_id": str(hospital_id),
            "generated_at": bed_prediction["current_occupancy"],
            "bed_forecast": {
                "current_utilization": bed_prediction["current_occupancy"]["utilization_percent"],
                "peak_predicted_day": max(bed_prediction["predictions"], key=lambda x: x["utilization_percent"]),
                "alerts_count": len(bed_prediction["alerts"])
            },
            "icu_forecast": {
                "current_utilization": icu_prediction["current_icu_status"]["utilization_percent"],
                "peak_predicted_day": max(icu_prediction["predictions"], key=lambda x: x["icu_utilization_percent"]),
                "alerts_count": len(icu_prediction["alerts"])
            },
            "high_risk_patients": {
                "critical_count": high_risk_patients["critical_risk_count"],
                "high_risk_count": high_risk_patients["high_risk_count"],
                "patients": high_risk_patients["critical_risk_patients"][:5]  # Top 5
            },
            "queue_status": {
                "total_waiting": queue_status["total_patients"],
                "critical_in_queue": queue_status["critical_patients"],
                "average_wait_minutes": round(queue_status["average_wait_time_minutes"], 1)
            },
            "bottlenecks": bottlenecks["bottlenecks"][:3],  # Top 3
            "action_items": self._generate_action_items(
                bed_prediction, icu_prediction, high_risk_patients, bottlenecks
            )
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_action_items(bed_pred, icu_pred, ews_results, bottlenecks) -> list:
    """Generate prioritized action items"""
    actions = []

    # High-risk patients
    if ews_results["critical_risk_count"] > 0:
        actions.append({
            "priority": "critical",
            "category": "patient_safety",
            "message": f"{ews_results['critical_risk_count']} patients require immediate medical review",
            "action": "Review Early Warning System alerts"
        })

    # Bed capacity issues
    critical_days = [p for p in bed_pred["predictions"] if p["status"] == "critical"]
    if critical_days:
        actions.append({
            "priority": "high",
            "category": "capacity",
            "message": f"Critical bed capacity predicted on {critical_days[0]['date']}",
            "action": "Review elective admissions and discharge planning"
        })

    # ICU capacity
    if icu_pred["current_icu_status"]["utilization_percent"] > 85:
        actions.append({
            "priority": "high",
            "category": "icu_capacity",
            "message": "ICU at high capacity",
            "action": "Prepare transfer protocols and overflow plans"
        })

    # Bottlenecks
    critical_bottlenecks = [b for b in bottlenecks["bottlenecks"] if b["severity"] == "critical"]
    if critical_bottlenecks:
        actions.append({
            "priority": "high",
            "category": "operations",
            "message": f"{len(critical_bottlenecks)} operational bottlenecks identified",
            "action": "Review bottleneck details and implement recommendations"
        })

    return sorted(actions, key=lambda x: {"critical": 0, "high": 1, "medium": 2}.get(x["priority"], 3))
