"""Admin analytics API routes"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_active_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/global-overview")
def get_global_overview(
    current_user: User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    """
    Get global system overview.

    Returns:
    - Total patients
    - Total hospitals
    - Total regions
    - Active visits
    - New patients (last 30 days)

    Permission: Super Admin only
    """
    analytics = AnalyticsService(db)
    return analytics.get_global_overview()


@router.get("/patients")
def get_patient_statistics(
    hospital_id: Optional[UUID] = Query(None),
    region_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get patient statistics with optional filtering.

    Filter by:
    - hospital_id: Statistics for specific hospital
    - region_id: Statistics for entire region

    Returns:
    - Total patients
    - Active patients
    - Gender breakdown

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_patient_statistics(hospital_id, region_id)


@router.get("/visits")
def get_visit_statistics(
    hospital_id: Optional[UUID] = Query(None),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get visit statistics.

    Query parameters:
    - hospital_id: Filter by hospital
    - days: Number of days for recent visits (default: 30)

    Returns:
    - Total visits
    - Active visits
    - Visit types breakdown (inpatient, outpatient, emergency)
    - Recent visits
    - Average length of stay

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_visit_statistics(hospital_id, days)


@router.get("/case-sheets")
def get_case_sheet_statistics(
    hospital_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get case sheet statistics (INPATIENT only).

    Returns:
    - Total case sheets
    - Active case sheets (not discharged)
    - Average events per case sheet

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_case_sheet_statistics(hospital_id)


@router.get("/nurse-acknowledgments")
def get_nurse_acknowledgment_statistics(
    hospital_id: Optional[UUID] = Query(None),
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get nurse acknowledgment statistics.

    Shows compliance rates for:
    - Vitals acknowledgment
    - Medication administration confirmation

    Query parameters:
    - hospital_id: Filter by hospital
    - days: Number of days to analyze (default: 7)

    Returns:
    - Vitals recorded vs acknowledged
    - Medications prescribed vs administered
    - Acknowledgment/administration rates

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_nurse_acknowledgment_statistics(hospital_id, days)


@router.get("/hospital/{hospital_id}/performance")
def get_hospital_performance(
    hospital_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get detailed performance metrics for a hospital.

    Returns:
    - Patient load (total, active visits, inpatient)
    - Staff count
    - EMR sync rate (how many discharged visits synced to global)

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_hospital_performance(hospital_id)


@router.get("/doctor-workload")
def get_doctor_workload(
    hospital_id: Optional[UUID] = Query(None),
    region_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get doctor workload statistics.

    Shows number of active patients per doctor.

    Filter by:
    - hospital_id: Doctors at specific hospital
    - region_id: Doctors across entire region

    Returns list of doctors with their active patient counts.

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_doctor_workload(hospital_id, region_id)


@router.get("/region/{region_id}/statistics")
def get_regional_statistics(
    region_id: UUID,
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive statistics for a region.

    Returns:
    - Total hospitals in region
    - Total patients across region
    - Active visits across region
    - Per-hospital breakdown

    Permission: Super Admin, Regional Admin
    """
    analytics = AnalyticsService(db)
    return analytics.get_regional_statistics(region_id)


@router.get("/sync-status")
def get_sync_status_report(
    hospital_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_role("super_admin", "regional_admin", "manager")),
    db: Session = Depends(get_db),
):
    """
    Get discharge sync status report.

    Shows how many discharged visits have been synced to global EMR.

    Returns:
    - Total discharged visits
    - Successfully synced
    - Pending sync
    - Failed sync
    - Sync rate percentage

    Permission: Admin, Regional Admin, Manager
    """
    analytics = AnalyticsService(db)
    return analytics.get_sync_status_report(hospital_id)
