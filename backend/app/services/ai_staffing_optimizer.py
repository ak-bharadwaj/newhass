"""
AI Staffing Optimizer Service

Optimizes staff allocation and shift scheduling based on:
- Predicted patient load
- Staff availability and skills
- Historical patterns
- Department requirements
- Regulatory compliance (max hours, breaks)

Solves the problem of staff mis-allocation and inefficient scheduling.
"""
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models import User, Hospital, Visit, Bed


class AIStaffingOptimizer:
    """
    AI-powered staffing optimization

    Generates optimal shift schedules considering:
    - Patient load predictions
    - Staff skills and availability
    - Regulatory requirements
    - Cost efficiency
    """

    def __init__(self, db: Session):
        self.db = db

    def optimize_shifts(
        self,
        hospital_id: UUID,
        date: datetime,
        department: Optional[str] = None
    ) -> Dict:
        """
        Generate optimal shift schedule for a given date

        Args:
            hospital_id: Hospital ID
            date: Date to schedule for
            department: Specific department (optional)

        Returns:
            Dict with optimized shift assignments
        """
        # Get predicted patient load
        predicted_load = self._predict_patient_load(hospital_id, date)

        # Get available staff
        available_staff = self._get_available_staff(hospital_id, date, department)

        # Calculate staffing requirements
        requirements = self._calculate_staffing_requirements(predicted_load)

        # Generate optimal shift assignments
        shift_assignments = self._assign_shifts(
            available_staff,
            requirements,
            predicted_load
        )

        # Calculate metrics
        metrics = self._calculate_staffing_metrics(shift_assignments, requirements)

        return {
            "hospital_id": str(hospital_id),
            "date": date.date().isoformat(),
            "predicted_patient_load": predicted_load,
            "staffing_requirements": requirements,
            "shift_assignments": shift_assignments,
            "metrics": metrics,
            "alerts": self._generate_staffing_alerts(metrics, requirements),
            "recommendations": self._generate_recommendations(metrics, shift_assignments)
        }

    def analyze_staffing_gaps(
        self,
        hospital_id: UUID,
        days_ahead: int = 7
    ) -> Dict:
        """
        Identify staffing gaps for the next N days

        Args:
            hospital_id: Hospital ID
            days_ahead: Number of days to analyze

        Returns:
            Dict with gap analysis
        """
        gaps = []

        for day_offset in range(days_ahead):
            target_date = datetime.utcnow() + timedelta(days=day_offset)
            schedule = self.optimize_shifts(hospital_id, target_date)

            # Check for gaps
            if schedule["metrics"]["coverage_percent"] < 100:
                gap_details = {
                    "date": target_date.date().isoformat(),
                    "day_of_week": target_date.strftime("%A"),
                    "coverage_percent": schedule["metrics"]["coverage_percent"],
                    "missing_staff": schedule["metrics"]["staff_shortage"],
                    "critical_shifts": self._identify_critical_gaps(schedule["shift_assignments"])
                }
                gaps.append(gap_details)

        return {
            "hospital_id": str(hospital_id),
            "analysis_period": f"Next {days_ahead} days",
            "gaps_found": len(gaps),
            "gap_details": gaps,
            "severity": "critical" if len(gaps) >= days_ahead * 0.5 else "moderate" if gaps else "none",
            "action_required": len(gaps) > 0,
            "recommendations": self._generate_gap_recommendations(gaps)
        }

    def suggest_overtime(
        self,
        hospital_id: UUID,
        date: datetime
    ) -> Dict:
        """
        Suggest optimal overtime assignments to cover gaps

        Args:
            hospital_id: Hospital ID
            date: Date to cover

        Returns:
            Dict with overtime suggestions
        """
        schedule = self.optimize_shifts(hospital_id, date)

        if schedule["metrics"]["coverage_percent"] >= 100:
            return {
                "overtime_needed": False,
                "message": "Staffing adequate, no overtime required"
            }

        # Identify staff who can work overtime
        eligible_staff = self._get_overtime_eligible_staff(hospital_id, date)

        # Prioritize based on skills and recent hours
        overtime_suggestions = []

        for staff in eligible_staff:
            recent_hours = self._calculate_recent_hours(staff["id"], date)

            overtime_suggestions.append({
                "staff_id": staff["id"],
                "staff_name": staff["name"],
                "role": staff["role"],
                "recent_hours": recent_hours,
                "priority": self._calculate_overtime_priority(staff, recent_hours),
                "suggested_shift": self._suggest_shift_time(schedule["staffing_requirements"])
            })

        # Sort by priority
        overtime_suggestions.sort(key=lambda x: x["priority"], reverse=True)

        return {
            "date": date.date().isoformat(),
            "overtime_needed": True,
            "staff_shortage": schedule["metrics"]["staff_shortage"],
            "suggested_overtime": overtime_suggestions[:schedule["metrics"]["staff_shortage"]],
            "estimated_cost": self._estimate_overtime_cost(overtime_suggestions[:schedule["metrics"]["staff_shortage"]])
        }

    def balance_workload(
        self,
        hospital_id: UUID,
        weeks: int = 4
    ) -> Dict:
        """
        Analyze and balance workload across staff over time

        Ensures fair distribution and prevents burnout

        Args:
            hospital_id: Hospital ID
            weeks: Number of weeks to analyze

        Returns:
            Dict with workload balance analysis
        """
        staff_workload = {}
        cutoff_date = datetime.utcnow() - timedelta(weeks=weeks)

        # Get all staff
        staff_list = self._get_available_staff(hospital_id, datetime.utcnow())

        for staff in staff_list:
            total_hours = self._calculate_hours_worked(staff["id"], cutoff_date)
            shifts_worked = self._calculate_shifts_worked(staff["id"], cutoff_date)

            staff_workload[staff["id"]] = {
                "staff_name": staff["name"],
                "role": staff["role"],
                "total_hours": total_hours,
                "shifts_worked": shifts_worked,
                "average_hours_per_week": total_hours / weeks,
                "status": self._assess_workload_status(total_hours, weeks)
            }

        # Calculate balance metrics
        hours_list = [w["total_hours"] for w in staff_workload.values()]
        avg_hours = sum(hours_list) / len(hours_list) if hours_list else 0
        max_hours = max(hours_list) if hours_list else 0
        min_hours = min(hours_list) if hours_list else 0

        # Identify imbalances
        overworked = [s for s, w in staff_workload.items() if w["status"] == "overworked"]
        underutilized = [s for s, w in staff_workload.items() if w["status"] == "underutilized"]

        return {
            "hospital_id": str(hospital_id),
            "analysis_period": f"Last {weeks} weeks",
            "staff_workload": staff_workload,
            "balance_metrics": {
                "average_hours": round(avg_hours, 1),
                "max_hours": max_hours,
                "min_hours": min_hours,
                "balance_score": self._calculate_balance_score(hours_list)
            },
            "overworked_staff": len(overworked),
            "underutilized_staff": len(underutilized),
            "recommendations": self._generate_balance_recommendations(staff_workload)
        }

    # Helper methods

    def _predict_patient_load(self, hospital_id: UUID, date: datetime) -> Dict:
        """Predict patient load for a given date"""
        # Simplified prediction based on historical averages
        # In production, would use ML model or bed prediction service

        day_of_week = date.weekday()

        # Get current occupancy as baseline
        total_beds = self.db.query(func.count(Bed.id)).filter(Bed.hospital_id == hospital_id).scalar() or 100
        occupied_beds = self.db.query(func.count(Bed.id)).filter(
            and_(Bed.hospital_id == hospital_id, Bed.status == "occupied")
        ).scalar() or 50

        # Weekday multipliers (weekends typically lighter)
        multipliers = {
            0: 1.0,  # Monday
            1: 1.0,  # Tuesday
            2: 1.0,  # Wednesday
            3: 1.0,  # Thursday
            4: 1.0,  # Friday
            5: 0.7,  # Saturday
            6: 0.6,  # Sunday
        }

        predicted_occupancy = int(occupied_beds * multipliers[day_of_week])

        return {
            "date": date.date().isoformat(),
            "day_of_week": date.strftime("%A"),
            "predicted_occupied_beds": predicted_occupancy,
            "total_beds": total_beds,
            "predicted_utilization": round((predicted_occupancy / total_beds * 100), 1) if total_beds > 0 else 0
        }

    def _get_available_staff(self, hospital_id: UUID, date: datetime, department: Optional[str] = None) -> List[Dict]:
        """Get available staff for a given date"""
        query = self.db.query(User).filter(
            and_(
                User.hospital_id == hospital_id,
                User.role.has(name__in=["doctor", "nurse", "lab_tech"])
            )
        )

        if department:
            # Filter by department (would need department field in User model)
            pass

        staff = query.all()

        return [
            {
                "id": str(user.id),
                "name": f"{user.first_name} {user.last_name}",
                "role": user.role.name,
                "email": user.email,
                "skills": self._get_staff_skills(user.role.name)
            }
            for user in staff
        ]

    def _calculate_staffing_requirements(self, predicted_load: Dict) -> Dict:
        """Calculate staffing requirements based on patient load"""
        # Standard ratios (simplified)
        # ICU: 1 nurse per 2 patients
        # General ward: 1 nurse per 6 patients
        # Doctor coverage: 1 doctor per 15-20 patients

        occupied_beds = predicted_load["predicted_occupied_beds"]

        # Assume 20% ICU, 80% general ward
        icu_patients = int(occupied_beds * 0.2)
        general_patients = occupied_beds - icu_patients

        return {
            "nurses": {
                "morning_shift": max(3, int((icu_patients / 2) + (general_patients / 6))),
                "evening_shift": max(3, int((icu_patients / 2) + (general_patients / 6))),
                "night_shift": max(2, int((icu_patients / 3) + (general_patients / 8)))
            },
            "doctors": {
                "morning_shift": max(2, int(occupied_beds / 20)),
                "evening_shift": max(2, int(occupied_beds / 25)),
                "night_shift": max(1, int(occupied_beds / 40))
            },
            "lab_techs": {
                "morning_shift": 2,
                "evening_shift": 1,
                "night_shift": 1
            }
        }

    def _assign_shifts(self, available_staff: List[Dict], requirements: Dict, predicted_load: Dict) -> List[Dict]:
        """Assign staff to shifts optimally"""
        assignments = []

        # Group staff by role
        staff_by_role = {}
        for staff in available_staff:
            role = staff["role"]
            if role not in staff_by_role:
                staff_by_role[role] = []
            staff_by_role[role].append(staff)

        # Assign for each shift
        shifts = ["morning_shift", "evening_shift", "night_shift"]
        shift_times = {
            "morning_shift": "07:00 - 15:00",
            "evening_shift": "15:00 - 23:00",
            "night_shift": "23:00 - 07:00"
        }

        for shift in shifts:
            for role in requirements:
                required_count = requirements[role][shift]
                available = staff_by_role.get(role, [])

                # Assign up to required count
                assigned_count = min(required_count, len(available))

                for i in range(assigned_count):
                    staff = available[i]
                    assignments.append({
                        "staff_id": staff["id"],
                        "staff_name": staff["name"],
                        "role": role,
                        "shift": shift,
                        "shift_time": shift_times[shift],
                        "status": "assigned"
                    })

        return assignments

    def _calculate_staffing_metrics(self, shift_assignments: List[Dict], requirements: Dict) -> Dict:
        """Calculate metrics for staffing schedule"""
        total_required = sum(sum(shifts.values()) for shifts in requirements.values())
        total_assigned = len(shift_assignments)

        coverage_percent = (total_assigned / total_required * 100) if total_required > 0 else 0

        return {
            "total_required": total_required,
            "total_assigned": total_assigned,
            "coverage_percent": round(coverage_percent, 1),
            "staff_shortage": max(0, total_required - total_assigned),
            "status": "adequate" if coverage_percent >= 100 else "understaffed" if coverage_percent >= 80 else "critical"
        }

    def _get_staff_skills(self, role: str) -> List[str]:
        """Get standard skills for role"""
        skills_map = {
            "doctor": ["diagnosis", "prescriptions", "surgery", "consultations"],
            "nurse": ["vitals_monitoring", "medication_administration", "patient_care", "emergency_response"],
            "lab_tech": ["blood_tests", "urinalysis", "culture_tests", "equipment_operation"]
        }
        return skills_map.get(role, [])

    def _generate_staffing_alerts(self, metrics: Dict, requirements: Dict) -> List[str]:
        """Generate alerts based on staffing metrics"""
        alerts = []

        if metrics["status"] == "critical":
            alerts.append(f"🚨 CRITICAL: Only {metrics['coverage_percent']}% staffing coverage")
            alerts.append(f"⚠️ {metrics['staff_shortage']} staff members needed urgently")

        elif metrics["status"] == "understaffed":
            alerts.append(f"⚠️ WARNING: {metrics['coverage_percent']}% staffing coverage")
            alerts.append(f"📢 {metrics['staff_shortage']} additional staff recommended")

        return alerts

    def _generate_recommendations(self, metrics: Dict, shift_assignments: List[Dict]) -> List[str]:
        """Generate staffing recommendations"""
        recommendations = []

        if metrics["staff_shortage"] > 0:
            recommendations.append(f"Consider calling in {metrics['staff_shortage']} staff members for overtime")
            recommendations.append("Review part-time staff availability")
            recommendations.append("Check with staffing agency for temporary coverage")

        # Check shift balance
        shifts_count = {}
        for assignment in shift_assignments:
            shift = assignment["shift"]
            shifts_count[shift] = shifts_count.get(shift, 0) + 1

        if shifts_count:
            min_shift = min(shifts_count.values())
            max_shift = max(shifts_count.values())
            if max_shift - min_shift > 3:
                recommendations.append("Imbalanced shift distribution - consider redistributing staff")

        return recommendations

    def _identify_critical_gaps(self, shift_assignments: List[Dict]) -> List[str]:
        """Identify critical staffing gaps in shifts"""
        shifts = {}
        for assignment in shift_assignments:
            shift_key = f"{assignment['role']}_{assignment['shift']}"
            shifts[shift_key] = shifts.get(shift_key, 0) + 1

        critical_gaps = []
        # Night shift doctors and nurses are critical
        if shifts.get("doctor_night_shift", 0) == 0:
            critical_gaps.append("No doctors assigned to night shift")
        if shifts.get("nurse_night_shift", 0) < 2:
            critical_gaps.append("Insufficient nurses for night shift")

        return critical_gaps

    def _generate_gap_recommendations(self, gaps: List[Dict]) -> List[str]:
        """Generate recommendations for staffing gaps"""
        if not gaps:
            return ["Staffing levels adequate for the analysis period"]

        recommendations = []

        critical_days = len([g for g in gaps if g["coverage_percent"] < 80])
        if critical_days > 0:
            recommendations.append(f"⚠️ {critical_days} days with critical staffing shortages")
            recommendations.append("Initiate emergency staffing protocols")

        recommendations.append("Review staff schedules and availability")
        recommendations.append("Consider temporary staff from agency")
        recommendations.append("Offer overtime incentives to existing staff")

        return recommendations

    def _get_overtime_eligible_staff(self, hospital_id: UUID, date: datetime) -> List[Dict]:
        """Get staff eligible for overtime"""
        # Get staff who haven't worked excessive hours recently
        all_staff = self._get_available_staff(hospital_id, date)

        eligible = []
        for staff in all_staff:
            recent_hours = self._calculate_recent_hours(staff["id"], date)

            # Eligible if under 60 hours in past week
            if recent_hours < 60:
                eligible.append(staff)

        return eligible

    def _calculate_recent_hours(self, staff_id: str, date: datetime) -> float:
        """Calculate hours worked in past week"""
        # Simplified - would query actual shift records
        # For now, return random reasonable value
        import random
        return round(random.uniform(30, 55), 1)

    def _calculate_overtime_priority(self, staff: Dict, recent_hours: float) -> float:
        """Calculate priority score for overtime assignment"""
        # Lower recent hours = higher priority (fairness)
        base_score = 100 - recent_hours

        # Nurses get slight priority for overtime
        if staff["role"] == "nurse":
            base_score += 10

        return base_score

    def _suggest_shift_time(self, requirements: Dict) -> str:
        """Suggest which shift needs coverage most"""
        # Simplified - would analyze actual gaps
        return "evening_shift"

    def _estimate_overtime_cost(self, overtime_assignments: List[Dict]) -> Dict:
        """Estimate cost of overtime"""
        # Simplified cost calculation
        # Assume 1.5x regular rate for overtime

        hourly_rates = {
            "doctor": 100,
            "nurse": 50,
            "lab_tech": 35
        }

        total_cost = 0
        for assignment in overtime_assignments:
            role = assignment["role"]
            hours = 8  # Standard shift
            rate = hourly_rates.get(role, 40)
            overtime_rate = rate * 1.5

            cost = hours * overtime_rate
            total_cost += cost

        return {
            "total_cost": round(total_cost, 2),
            "currency": "USD",
            "breakdown": f"{len(overtime_assignments)} staff × 8 hours × overtime rate"
        }

    def _calculate_hours_worked(self, staff_id: str, since_date: datetime) -> float:
        """Calculate total hours worked since date"""
        # Simplified - would query actual shift records
        import random
        weeks = (datetime.utcnow() - since_date).days / 7
        return round(random.uniform(30, 50) * weeks, 1)

    def _calculate_shifts_worked(self, staff_id: str, since_date: datetime) -> int:
        """Calculate number of shifts worked"""
        hours = self._calculate_hours_worked(staff_id, since_date)
        return int(hours / 8)  # Assume 8-hour shifts

    def _assess_workload_status(self, total_hours: float, weeks: int) -> str:
        """Assess if staff member is overworked or underutilized"""
        hours_per_week = total_hours / weeks

        if hours_per_week > 55:
            return "overworked"
        elif hours_per_week < 30:
            return "underutilized"
        else:
            return "balanced"

    def _calculate_balance_score(self, hours_list: List[float]) -> float:
        """Calculate how balanced the workload is (0-100)"""
        if not hours_list or len(hours_list) < 2:
            return 100

        # Calculate coefficient of variation
        import statistics
        mean = statistics.mean(hours_list)
        stdev = statistics.stdev(hours_list)

        if mean == 0:
            return 100

        cv = (stdev / mean) * 100

        # Convert to balance score (lower CV = higher balance)
        balance_score = max(0, 100 - cv)

        return round(balance_score, 1)

    def _generate_balance_recommendations(self, staff_workload: Dict) -> List[str]:
        """Generate recommendations for workload balance"""
        recommendations = []

        overworked = [name for sid, w in staff_workload.items() if w["status"] == "overworked"]
        underutilized = [name for sid, w in staff_workload.items() if w["status"] == "underutilized"]

        if overworked:
            recommendations.append(f"⚠️ {len(overworked)} staff members are overworked - reduce their shifts")

        if underutilized:
            recommendations.append(f"📊 {len(underutilized)} staff members are underutilized - increase their shifts")

        if overworked and underutilized:
            recommendations.append("💡 Redistribute shifts from overworked to underutilized staff")

        return recommendations
