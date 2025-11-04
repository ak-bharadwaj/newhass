"""
AI Bed & Resource Prediction Service

Predicts bed occupancy and ICU load for the next 7 days using ML patterns
and historical data analysis.

This service helps prevent:
- Bed shortages
- ICU overload
- Resource allocation issues
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID
import statistics
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from app.models import Visit, Bed, Patient, Hospital
from app.core.config import settings


class AIBedPredictionService:
    """
    AI-powered bed and resource prediction service

    Uses historical patterns to forecast:
    - Total bed occupancy (next 7 days)
    - ICU bed requirements
    - Resource bottlenecks
    """

    def __init__(self, db: Session):
        self.db = db

    def predict_bed_occupancy(
        self,
        hospital_id: UUID,
        days_ahead: int = 7
    ) -> Dict:
        """
        Predict bed occupancy for the next N days

        Args:
            hospital_id: Hospital to predict for
            days_ahead: Number of days to predict (default 7)

        Returns:
            Dict with daily predictions including confidence intervals
        """
        # Get current occupancy
        current_occupancy = self._get_current_occupancy(hospital_id)

        # Get historical patterns
        historical_data = self._get_historical_data(hospital_id, lookback_days=90)

        # Calculate day-of-week patterns
        dow_patterns = self._calculate_day_of_week_patterns(historical_data)

        # Calculate admission/discharge rates
        admission_rate = self._calculate_admission_rate(historical_data)
        discharge_rate = self._calculate_discharge_rate(historical_data)
        average_stay = self._calculate_average_stay_duration(hospital_id)

        # Generate predictions
        predictions = []
        projected_occupancy = current_occupancy["occupied_beds"]

        for day in range(days_ahead):
            prediction_date = datetime.utcnow() + timedelta(days=day + 1)
            day_of_week = prediction_date.weekday()

            # Apply day-of-week pattern
            dow_multiplier = dow_patterns.get(day_of_week, 1.0)

            # Predict admissions and discharges
            expected_admissions = admission_rate * dow_multiplier
            expected_discharges = discharge_rate * dow_multiplier

            # Update projected occupancy
            projected_occupancy += expected_admissions - expected_discharges
            projected_occupancy = max(0, min(projected_occupancy, current_occupancy["total_beds"]))

            # Calculate confidence interval (simple approach)
            std_dev = statistics.stdev([h["occupied"] for h in historical_data]) if len(historical_data) > 1 else 5
            confidence_lower = max(0, projected_occupancy - std_dev * 1.96)
            confidence_upper = min(current_occupancy["total_beds"], projected_occupancy + std_dev * 1.96)

            # Calculate utilization
            utilization = (projected_occupancy / current_occupancy["total_beds"] * 100) if current_occupancy["total_beds"] > 0 else 0

            # Determine status
            status = "normal"
            if utilization > 90:
                status = "critical"
            elif utilization > 75:
                status = "high"
            elif utilization < 40:
                status = "low"

            predictions.append({
                "date": prediction_date.date().isoformat(),
                "day_of_week": prediction_date.strftime("%A"),
                "predicted_occupancy": round(projected_occupancy, 1),
                "confidence_lower": round(confidence_lower, 1),
                "confidence_upper": round(confidence_upper, 1),
                "utilization_percent": round(utilization, 1),
                "available_beds": round(current_occupancy["total_beds"] - projected_occupancy, 1),
                "status": status,
                "expected_admissions": round(expected_admissions, 1),
                "expected_discharges": round(expected_discharges, 1)
            })

        return {
            "hospital_id": str(hospital_id),
            "current_occupancy": current_occupancy,
            "predictions": predictions,
            "metrics": {
                "average_stay_days": round(average_stay, 1),
                "daily_admission_rate": round(admission_rate, 1),
                "daily_discharge_rate": round(discharge_rate, 1),
                "prediction_confidence": "medium"  # Would be calculated from model accuracy
            },
            "alerts": self._generate_alerts(predictions)
        }

    def predict_icu_load(
        self,
        hospital_id: UUID,
        days_ahead: int = 7
    ) -> Dict:
        """
        Predict ICU bed requirements for next N days

        Returns:
            Dict with ICU-specific predictions
        """
        # Get ICU beds
        icu_beds = self.db.query(Bed).filter(
            and_(
                Bed.hospital_id == hospital_id,
                Bed.bed_type == "icu"
            )
        ).all()

        total_icu_beds = len(icu_beds)
        occupied_icu_beds = len([b for b in icu_beds if b.status == "occupied"])

        # Get historical ICU admission patterns
        historical_icu = self._get_historical_icu_data(hospital_id, lookback_days=90)

        # Calculate ICU admission rate
        icu_admission_rate = len(historical_icu) / 90  # admissions per day

        # Predict ICU load
        predictions = []
        projected_icu_occupancy = occupied_icu_beds

        for day in range(days_ahead):
            prediction_date = datetime.utcnow() + timedelta(days=day + 1)

            # ICU admissions typically slightly increase on weekdays
            is_weekday = prediction_date.weekday() < 5
            multiplier = 1.1 if is_weekday else 0.9

            expected_icu_admissions = icu_admission_rate * multiplier
            expected_icu_discharges = icu_admission_rate * 0.7  # ICU stays longer

            projected_icu_occupancy += expected_icu_admissions - expected_icu_discharges
            projected_icu_occupancy = max(0, min(projected_icu_occupancy, total_icu_beds))

            icu_utilization = (projected_icu_occupancy / total_icu_beds * 100) if total_icu_beds > 0 else 0

            # ICU critical threshold is lower (70%)
            status = "normal"
            if icu_utilization > 85:
                status = "critical"
            elif icu_utilization > 70:
                status = "high"

            predictions.append({
                "date": prediction_date.date().isoformat(),
                "predicted_icu_occupancy": round(projected_icu_occupancy, 1),
                "icu_utilization_percent": round(icu_utilization, 1),
                "available_icu_beds": round(total_icu_beds - projected_icu_occupancy, 1),
                "status": status
            })

        return {
            "hospital_id": str(hospital_id),
            "current_icu_status": {
                "total_icu_beds": total_icu_beds,
                "occupied_icu_beds": occupied_icu_beds,
                "available_icu_beds": total_icu_beds - occupied_icu_beds,
                "utilization_percent": round((occupied_icu_beds / total_icu_beds * 100) if total_icu_beds > 0 else 0, 1)
            },
            "predictions": predictions,
            "alerts": self._generate_icu_alerts(predictions)
        }

    def get_resource_bottlenecks(
        self,
        hospital_id: UUID
    ) -> Dict:
        """
        Identify current and predicted resource bottlenecks

        Returns:
            Dict with bottleneck analysis
        """
        bed_prediction = self.predict_bed_occupancy(hospital_id, days_ahead=7)
        icu_prediction = self.predict_icu_load(hospital_id, days_ahead=7)

        bottlenecks = []

        # Check for high occupancy days
        for pred in bed_prediction["predictions"]:
            if pred["status"] in ["high", "critical"]:
                bottlenecks.append({
                    "type": "bed_shortage",
                    "date": pred["date"],
                    "severity": pred["status"],
                    "details": f"Predicted {pred['utilization_percent']}% bed utilization",
                    "recommendation": "Consider postponing elective admissions or arrange overflow capacity"
                })

        # Check ICU bottlenecks
        for pred in icu_prediction["predictions"]:
            if pred["status"] in ["high", "critical"]:
                bottlenecks.append({
                    "type": "icu_shortage",
                    "date": pred["date"],
                    "severity": pred["status"],
                    "details": f"Predicted {pred['icu_utilization_percent']}% ICU utilization",
                    "recommendation": "Alert ICU team, prepare for transfers if needed"
                })

        return {
            "hospital_id": str(hospital_id),
            "analysis_date": datetime.utcnow().isoformat(),
            "bottlenecks": bottlenecks,
            "summary": {
                "total_bottlenecks": len(bottlenecks),
                "critical_days": len([b for b in bottlenecks if b["severity"] == "critical"]),
                "high_risk_days": len([b for b in bottlenecks if b["severity"] == "high"])
            }
        }

    # Helper methods

    def _get_current_occupancy(self, hospital_id: UUID) -> Dict:
        """Get current bed occupancy"""
        beds = self.db.query(Bed).filter(Bed.hospital_id == hospital_id).all()
        total_beds = len(beds)
        occupied_beds = len([b for b in beds if b.status == "occupied"])

        return {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": total_beds - occupied_beds,
            "utilization_percent": (occupied_beds / total_beds * 100) if total_beds > 0 else 0
        }

    def _get_historical_data(self, hospital_id: UUID, lookback_days: int = 90) -> List[Dict]:
        """Get historical occupancy data"""
        cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)

        # Get visits in the lookback period
        visits = self.db.query(Visit).filter(
            and_(
                Visit.hospital_id == hospital_id,
                Visit.admission_date >= cutoff_date
            )
        ).all()

        # Group by date and count occupancy
        date_occupancy = {}
        for visit in visits:
            admission_date = visit.admission_date.date()
            discharge_date = visit.discharge_date.date() if visit.discharge_date else datetime.utcnow().date()

            # Count occupied beds for each day of the stay
            current_date = admission_date
            while current_date <= discharge_date:
                date_key = current_date.isoformat()
                date_occupancy[date_key] = date_occupancy.get(date_key, 0) + 1
                current_date += timedelta(days=1)

        # Convert to list
        historical_data = []
        for date_str, occupied in date_occupancy.items():
            date_obj = datetime.fromisoformat(date_str)
            historical_data.append({
                "date": date_str,
                "day_of_week": date_obj.weekday(),
                "occupied": occupied
            })

        return historical_data

    def _get_historical_icu_data(self, hospital_id: UUID, lookback_days: int = 90) -> List:
        """Get historical ICU admission data"""
        cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)

        # Get ICU bed IDs
        icu_bed_ids = [
            bed.id for bed in self.db.query(Bed).filter(
                and_(
                    Bed.hospital_id == hospital_id,
                    Bed.bed_type == "icu"
                )
            ).all()
        ]

        # Get visits assigned to ICU beds
        icu_visits = self.db.query(Visit).join(
            Bed, Bed.assigned_visit_id == Visit.id
        ).filter(
            and_(
                Visit.hospital_id == hospital_id,
                Bed.bed_type == "icu",
                Visit.admission_date >= cutoff_date
            )
        ).all()

        return icu_visits

    def _calculate_day_of_week_patterns(self, historical_data: List[Dict]) -> Dict[int, float]:
        """Calculate admission patterns by day of week"""
        if not historical_data:
            return {i: 1.0 for i in range(7)}

        # Group by day of week
        dow_groups = {i: [] for i in range(7)}
        for data in historical_data:
            dow_groups[data["day_of_week"]].append(data["occupied"])

        # Calculate average for each day
        dow_averages = {}
        overall_average = statistics.mean([d["occupied"] for d in historical_data])

        for dow, values in dow_groups.items():
            if values:
                dow_average = statistics.mean(values)
                dow_averages[dow] = dow_average / overall_average if overall_average > 0 else 1.0
            else:
                dow_averages[dow] = 1.0

        return dow_averages

    def _calculate_admission_rate(self, historical_data: List[Dict]) -> float:
        """Calculate average daily admission rate"""
        if not historical_data:
            return 5.0  # Default assumption

        # Simplified: assume admissions correlate with occupancy changes
        # In production, query actual admission records
        occupancy_values = [d["occupied"] for d in historical_data]
        return statistics.mean(occupancy_values) * 0.15  # ~15% turnover per day

    def _calculate_discharge_rate(self, historical_data: List[Dict]) -> float:
        """Calculate average daily discharge rate"""
        # Discharge rate typically similar to admission rate for steady state
        return self._calculate_admission_rate(historical_data)

    def _calculate_average_stay_duration(self, hospital_id: UUID) -> float:
        """Calculate average length of stay"""
        recent_visits = self.db.query(Visit).filter(
            and_(
                Visit.hospital_id == hospital_id,
                Visit.status == "discharged",
                Visit.discharge_date.isnot(None)
            )
        ).limit(100).all()

        if not recent_visits:
            return 3.5  # Default assumption

        stay_durations = []
        for visit in recent_visits:
            duration = (visit.discharge_date - visit.admission_date).days
            stay_durations.append(max(0.5, duration))  # Minimum 0.5 day

        return statistics.mean(stay_durations)

    def _generate_alerts(self, predictions: List[Dict]) -> List[Dict]:
        """Generate alerts based on predictions"""
        alerts = []

        for pred in predictions:
            if pred["status"] == "critical":
                alerts.append({
                    "severity": "critical",
                    "date": pred["date"],
                    "message": f"CRITICAL: Predicted bed utilization {pred['utilization_percent']}% on {pred['day_of_week']}",
                    "action_required": "Immediate capacity planning needed"
                })
            elif pred["status"] == "high":
                alerts.append({
                    "severity": "warning",
                    "date": pred["date"],
                    "message": f"HIGH: Predicted bed utilization {pred['utilization_percent']}% on {pred['day_of_week']}",
                    "action_required": "Review elective admissions"
                })

        return alerts

    def _generate_icu_alerts(self, predictions: List[Dict]) -> List[Dict]:
        """Generate ICU-specific alerts"""
        alerts = []

        for pred in predictions:
            if pred["status"] == "critical":
                alerts.append({
                    "severity": "critical",
                    "date": pred["date"],
                    "message": f"CRITICAL ICU ALERT: {pred['icu_utilization_percent']}% predicted utilization",
                    "action_required": "Alert ICU team, prepare transfer protocols"
                })
            elif pred["status"] == "high":
                alerts.append({
                    "severity": "warning",
                    "date": pred["date"],
                    "message": f"ICU HIGH: {pred['icu_utilization_percent']}% predicted utilization",
                    "action_required": "Monitor closely, standby capacity"
                })

        return alerts
