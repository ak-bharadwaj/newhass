"""Analytics service for admin dashboard metrics"""
from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case

from app.models.patient import Patient
from app.models.visit import Visit
from app.models.vitals import Vitals
from app.models.prescription import Prescription
from app.models.case_sheet import CaseSheet
from app.models.hospital import Hospital
from app.models.region import Region
from app.models.user import User


class AnalyticsService:
    """
    Analytics service for admin dashboard.

    Provides metrics on:
    - Patient statistics
    - Visit statistics
    - Case sheet statistics (inpatient)
    - Nurse acknowledgment rates
    - Hospital performance
    - Doctor workload
    """

    def __init__(self, db: Session):
        self.db = db

    def get_global_overview(self) -> Dict:
        """Get global system overview for super admin"""
        total_patients = self.db.query(func.count(Patient.id)).scalar()
        total_hospitals = self.db.query(func.count(Hospital.id)).filter(Hospital.is_active == True).scalar()
        total_regions = self.db.query(func.count(Region.id)).filter(Region.is_active == True).scalar()

        active_visits = self.db.query(func.count(Visit.id)).filter(Visit.status == "active").scalar()

        # Patients created in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_patients_30d = self.db.query(func.count(Patient.id)).filter(
            Patient.created_at >= thirty_days_ago
        ).scalar()

        return {
            "total_patients": total_patients,
            "total_hospitals": total_hospitals,
            "total_regions": total_regions,
            "active_visits": active_visits,
            "new_patients_last_30_days": new_patients_30d
        }

    def get_patient_statistics(
        self,
        hospital_id: Optional[UUID] = None,
        region_id: Optional[UUID] = None
    ) -> Dict:
        """Get patient statistics with optional filtering"""
        query = self.db.query(Patient)

        if hospital_id:
            query = query.filter(Patient.hospital_id == hospital_id)
        elif region_id:
            query = query.join(Hospital).filter(Hospital.region_id == region_id)

        total = query.count()
        active = query.filter(Patient.is_active == True).count()

        # Gender breakdown
        gender_counts = self.db.query(
            Patient.gender,
            func.count(Patient.id)
        ).group_by(Patient.gender).all()

        return {
            "total_patients": total,
            "active_patients": active,
            "gender_breakdown": {gender: count for gender, count in gender_counts}
        }

    def get_visit_statistics(
        self,
        hospital_id: Optional[UUID] = None,
        days: int = 30
    ) -> Dict:
        """Get visit statistics"""
        query = self.db.query(Visit)

        if hospital_id:
            query = query.filter(Visit.hospital_id == hospital_id)

        # Total visits
        total_visits = query.count()

        # Active visits
        active_visits = query.filter(Visit.status == "active").count()

        # Visit types breakdown
        visit_types = self.db.query(
            Visit.visit_type,
            func.count(Visit.id)
        ).group_by(Visit.visit_type).all()

        # Visits in last N days
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_visits = query.filter(Visit.admission_date >= cutoff_date).count()

        # Average length of stay (for discharged visits)
        avg_los = self.db.query(
            func.avg(
                func.extract('epoch', Visit.discharge_date - Visit.admission_date) / 86400
            )
        ).filter(
            Visit.status == "discharged",
            Visit.discharge_date.isnot(None)
        ).scalar()

        return {
            "total_visits": total_visits,
            "active_visits": active_visits,
            "visit_types": {vtype: count for vtype, count in visit_types},
            f"visits_last_{days}_days": recent_visits,
            "average_length_of_stay_days": round(float(avg_los), 2) if avg_los else 0
        }

    def get_case_sheet_statistics(
        self,
        hospital_id: Optional[UUID] = None
    ) -> Dict:
        """Get case sheet statistics (inpatient only)"""
        query = self.db.query(CaseSheet)

        if hospital_id:
            query = query.filter(CaseSheet.hospital_id == hospital_id)

        total_case_sheets = query.count()

        # Active case sheets (not discharged)
        active_case_sheets = query.filter(CaseSheet.discharge_date.is_(None)).count()

        # Average events per case sheet
        avg_events = self.db.query(
            func.avg(func.jsonb_array_length(CaseSheet.event_timeline))
        ).filter(CaseSheet.event_timeline.isnot(None)).scalar()

        return {
            "total_case_sheets": total_case_sheets,
            "active_case_sheets": active_case_sheets,
            "average_events_per_case": round(float(avg_events), 2) if avg_events else 0
        }

    def get_nurse_acknowledgment_statistics(
        self,
        hospital_id: Optional[UUID] = None,
        days: int = 7
    ) -> Dict:
        """Get nurse acknowledgment statistics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Vitals acknowledgment rate
        vitals_query = self.db.query(Vitals).filter(Vitals.recorded_at >= cutoff_date)
        if hospital_id:
            vitals_query = vitals_query.join(Visit).filter(Visit.hospital_id == hospital_id)

        total_vitals = vitals_query.count()
        acknowledged_vitals = vitals_query.filter(Vitals.acknowledged_by.isnot(None)).count()

        vitals_ack_rate = (acknowledged_vitals / total_vitals * 100) if total_vitals > 0 else 0

        # Medication administration rate
        med_query = self.db.query(Prescription).filter(Prescription.created_at >= cutoff_date)
        if hospital_id:
            med_query = med_query.join(Visit).filter(Visit.hospital_id == hospital_id)

        total_prescriptions = med_query.filter(Prescription.status.in_(["active", "dispensed"])).count()
        administered_meds = med_query.filter(
            Prescription.administered_at.isnot(None),
            Prescription.administration_confirmed == True
        ).count()

        med_admin_rate = (administered_meds / total_prescriptions * 100) if total_prescriptions > 0 else 0

        return {
            f"last_{days}_days": {
                "vitals": {
                    "total_recorded": total_vitals,
                    "acknowledged": acknowledged_vitals,
                    "acknowledgment_rate_percent": round(vitals_ack_rate, 2)
                },
                "medications": {
                    "total_prescribed": total_prescriptions,
                    "administered_confirmed": administered_meds,
                    "administration_rate_percent": round(med_admin_rate, 2)
                }
            }
        }

    def get_hospital_performance(self, hospital_id: UUID) -> Dict:
        """Get detailed performance metrics for a hospital"""
        # Patient load
        total_patients = self.db.query(func.count(Patient.id)).filter(
            Patient.hospital_id == hospital_id
        ).scalar()

        # Visit statistics
        active_visits = self.db.query(func.count(Visit.id)).filter(
            Visit.hospital_id == hospital_id,
            Visit.status == "active"
        ).scalar()

        # Inpatient cases
        active_inpatient = self.db.query(func.count(Visit.id)).filter(
            Visit.hospital_id == hospital_id,
            Visit.visit_type == "inpatient",
            Visit.status == "active"
        ).scalar()

        # Staff count
        staff_count = self.db.query(func.count(User.id)).filter(
            User.hospital_id == hospital_id,
            User.is_active == True
        ).scalar()

        # Global EMR sync rate (discharged visits)
        total_discharged = self.db.query(func.count(Visit.id)).filter(
            Visit.hospital_id == hospital_id,
            Visit.status == "discharged"
        ).scalar()

        synced_visits = self.db.query(func.count(Visit.id)).filter(
            Visit.hospital_id == hospital_id,
            Visit.status == "discharged",
            Visit.synced_to_global == True
        ).scalar()

        sync_rate = (synced_visits / total_discharged * 100) if total_discharged > 0 else 0

        return {
            "hospital_id": str(hospital_id),
            "patient_load": {
                "total_patients": total_patients,
                "active_visits": active_visits,
                "active_inpatient": active_inpatient
            },
            "staff_count": staff_count,
            "emr_sync": {
                "total_discharged": total_discharged,
                "synced_to_global": synced_visits,
                "sync_rate_percent": round(sync_rate, 2)
            }
        }

    def get_doctor_workload(
        self,
        hospital_id: Optional[UUID] = None,
        region_id: Optional[UUID] = None
    ) -> List[Dict]:
        """Get doctor workload statistics"""
        query = self.db.query(
            User.id,
            User.first_name,
            User.last_name,
            func.count(Visit.id).label("active_patients")
        ).join(
            Visit, Visit.attending_doctor_id == User.id
        ).filter(
            Visit.status == "active"
        ).group_by(
            User.id, User.first_name, User.last_name
        )

        if hospital_id:
            query = query.filter(User.hospital_id == hospital_id)
        elif region_id:
            query = query.join(Hospital).filter(Hospital.region_id == region_id)

        results = query.all()

        return [
            {
                "doctor_id": str(doc_id),
                "doctor_name": f"Dr. {first_name} {last_name}",
                "active_patients": count
            }
            for doc_id, first_name, last_name, count in results
        ]

    def get_regional_statistics(self, region_id: UUID) -> Dict:
        """Get statistics for a region"""
        # Hospitals in region
        hospitals = self.db.query(Hospital).filter(
            Hospital.region_id == region_id,
            Hospital.is_active == True
        ).all()

        total_hospitals = len(hospitals)

        # Total patients across all hospitals in region
        total_patients = self.db.query(func.count(Patient.id)).join(Hospital).filter(
            Hospital.region_id == region_id
        ).scalar()

        # Active visits across region
        active_visits = self.db.query(func.count(Visit.id)).join(Hospital).filter(
            Hospital.region_id == region_id,
            Visit.status == "active"
        ).scalar()

        # Per-hospital breakdown
        hospital_stats = []
        for hospital in hospitals:
            hospital_stats.append({
                "hospital_id": str(hospital.id),
                "hospital_name": hospital.name,
                "active_visits": self.db.query(func.count(Visit.id)).filter(
                    Visit.hospital_id == hospital.id,
                    Visit.status == "active"
                ).scalar()
            })

        return {
            "region_id": str(region_id),
            "total_hospitals": total_hospitals,
            "total_patients": total_patients,
            "active_visits_across_region": active_visits,
            "hospitals": hospital_stats
        }

    def get_sync_status_report(
        self,
        hospital_id: Optional[UUID] = None
    ) -> Dict:
        """Get report on discharge sync status"""
        query = self.db.query(Visit).filter(Visit.status == "discharged")

        if hospital_id:
            query = query.filter(Visit.hospital_id == hospital_id)

        total_discharged = query.count()
        synced = query.filter(Visit.synced_to_global == True).count()
        pending = query.filter(
            Visit.synced_to_global == False,
            Visit.sync_status == "pending"
        ).count()
        failed = query.filter(Visit.sync_status == "failed").count()

        return {
            "total_discharged": total_discharged,
            "synced": synced,
            "pending_sync": pending,
            "failed_sync": failed,
            "sync_rate_percent": round((synced / total_discharged * 100), 2) if total_discharged > 0 else 0
        }
