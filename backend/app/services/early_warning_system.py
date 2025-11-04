"""
Early Warning System (EWS) for Critical Condition Detection

Detects early signs of:
- Sepsis (SIRS criteria + infection markers)
- Cardiac events (arrhythmia, MI risk)
- Respiratory distress
- Shock
- Organ failure

Uses vital signs patterns and clinical indicators to provide early warnings
that can save lives through timely intervention.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Vitals, Patient, Visit, LabTest
from app.services.notification_service import NotificationService


class EarlyWarningSystem:
    """
    AI-powered early warning system for critical conditions

    Analyzes vital signs trends and clinical data to detect:
    - Sepsis risk (SIRS + infection)
    - Cardiac events
    - Respiratory failure
    - Shock
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)

    def assess_patient_risk(
        self,
        patient_id: UUID,
        visit_id: Optional[UUID] = None
    ) -> Dict:
        """
        Comprehensive risk assessment for a patient

        Args:
            patient_id: Patient ID
            visit_id: Specific visit to assess (optional)

        Returns:
            Dict with risk scores and alerts
        """
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()

        if not patient:
            raise ValueError("Patient not found")

        # Get recent vitals (last 24 hours)
        recent_vitals = self._get_recent_vitals(patient_id, hours=24)

        if not recent_vitals:
            return {
                "patient_id": str(patient_id),
                "assessment_time": datetime.utcnow().isoformat(),
                "message": "Insufficient vitals data for assessment",
                "risk_level": "unknown"
            }

        # Run multiple risk assessments
        sepsis_risk = self._assess_sepsis_risk(patient_id, recent_vitals)
        cardiac_risk = self._assess_cardiac_risk(patient_id, recent_vitals)
        respiratory_risk = self._assess_respiratory_risk(recent_vitals)
        shock_risk = self._assess_shock_risk(recent_vitals)
        mews_score = self._calculate_mews_score(recent_vitals[-1])  # Modified Early Warning Score

        # Determine overall risk level
        overall_risk = self._determine_overall_risk(
            sepsis_risk, cardiac_risk, respiratory_risk, shock_risk, mews_score
        )

        # Generate alerts and recommendations
        alerts = self._generate_alerts(
            patient, sepsis_risk, cardiac_risk, respiratory_risk, shock_risk, overall_risk
        )

        # Trigger notifications if critical
        if overall_risk["level"] in ["high", "critical"]:
            self._trigger_critical_alerts(patient, overall_risk, alerts)

        return {
            "patient_id": str(patient_id),
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "assessment_time": datetime.utcnow().isoformat(),
            "overall_risk": overall_risk,
            "sepsis_risk": sepsis_risk,
            "cardiac_risk": cardiac_risk,
            "respiratory_risk": respiratory_risk,
            "shock_risk": shock_risk,
            "mews_score": mews_score,
            "alerts": alerts,
            "recommendations": self._generate_recommendations(overall_risk, alerts),
            "vitals_count": len(recent_vitals)
        }

    def monitor_all_patients(
        self,
        hospital_id: Optional[UUID] = None
    ) -> Dict:
        """
        Monitor all active patients and identify high-risk cases

        Args:
            hospital_id: Filter by hospital (optional)

        Returns:
            Dict with high-risk patients and summary
        """
        # Get all active visits
        query = self.db.query(Visit).filter(Visit.status == "active")

        if hospital_id:
            query = query.filter(Visit.hospital_id == hospital_id)

        active_visits = query.all()

        high_risk_patients = []
        moderate_risk_patients = []
        total_assessed = 0

        for visit in active_visits:
            try:
                assessment = self.assess_patient_risk(visit.patient_id, visit.id)
                total_assessed += 1

                risk_level = assessment["overall_risk"]["level"]

                if risk_level == "critical":
                    # Get current bed assignment
                    current_bed = None
                    if visit.beds:
                        # Get the most recent bed assignment
                        active_beds = [b for b in visit.beds if b.status == "occupied" and b.assigned_visit_id == visit.id]
                        if active_beds:
                            current_bed = active_beds[0].bed_number

                    high_risk_patients.append({
                        "priority": "critical",
                        "patient": assessment["patient_name"],
                        "patient_id": assessment["patient_id"],
                        "risk_score": assessment["overall_risk"]["score"],
                        "primary_concerns": assessment["alerts"][:2],  # Top 2 alerts
                        "bed": current_bed or "Unknown"
                    })
                elif risk_level == "high":
                    # Get current bed assignment
                    current_bed = None
                    if visit.beds:
                        # Get the most recent bed assignment
                        active_beds = [b for b in visit.beds if b.status == "occupied" and b.assigned_visit_id == visit.id]
                        if active_beds:
                            current_bed = active_beds[0].bed_number

                    moderate_risk_patients.append({
                        "priority": "high",
                        "patient": assessment["patient_name"],
                        "patient_id": assessment["patient_id"],
                        "risk_score": assessment["overall_risk"]["score"],
                        "primary_concerns": assessment["alerts"][:2],
                        "bed": current_bed or "Unknown"
                    })

            except Exception as e:
                # Skip patients with insufficient data
                continue

        # Sort by risk score
        high_risk_patients.sort(key=lambda x: x["risk_score"], reverse=True)
        moderate_risk_patients.sort(key=lambda x: x["risk_score"], reverse=True)

        return {
            "hospital_id": str(hospital_id) if hospital_id else "all",
            "scan_time": datetime.utcnow().isoformat(),
            "total_patients_assessed": total_assessed,
            "critical_risk_count": len(high_risk_patients),
            "high_risk_count": len(moderate_risk_patients),
            "critical_risk_patients": high_risk_patients,
            "high_risk_patients": moderate_risk_patients,
            "summary": self._generate_monitoring_summary(high_risk_patients, moderate_risk_patients)
        }

    # Risk Assessment Methods

    def _assess_sepsis_risk(self, patient_id: UUID, recent_vitals: List[Vitals]) -> Dict:
        """
        Assess sepsis risk using SIRS criteria

        SIRS (Systemic Inflammatory Response Syndrome) criteria:
        - Temperature > 38°C or < 36°C
        - Heart rate > 90 bpm
        - Respiratory rate > 20 or PaCO2 < 32 mmHg
        - WBC > 12,000 or < 4,000 or >10% bands

        Sepsis = SIRS + suspected/confirmed infection
        """
        if not recent_vitals:
            return {"risk_level": "unknown", "score": 0}

        latest = recent_vitals[-1]
        sirs_criteria_met = 0
        details = []

        # Temperature criterion
        if latest.temperature:
            if latest.temperature > 38.0 or latest.temperature < 36.0:
                sirs_criteria_met += 1
                details.append(f"Abnormal temperature: {latest.temperature}°C")

        # Heart rate criterion
        if latest.heart_rate:
            if latest.heart_rate > 90:
                sirs_criteria_met += 1
                details.append(f"Tachycardia: {latest.heart_rate} bpm")

        # Check for infection markers (simplified - would check lab tests in production)
        has_infection_signs = self._check_infection_signs(patient_id)

        if has_infection_signs:
            sirs_criteria_met += 1
            details.append("Infection markers present")

        # Calculate risk
        if sirs_criteria_met >= 2 and has_infection_signs:
            risk_level = "critical"
            score = 80 + (sirs_criteria_met * 5)
        elif sirs_criteria_met >= 2:
            risk_level = "high"
            score = 60 + (sirs_criteria_met * 5)
        elif sirs_criteria_met == 1:
            risk_level = "moderate"
            score = 40
        else:
            risk_level = "low"
            score = 10

        return {
            "risk_level": risk_level,
            "score": min(score, 100),
            "sirs_criteria_met": sirs_criteria_met,
            "has_infection_signs": has_infection_signs,
            "details": details,
            "alert": sirs_criteria_met >= 2
        }

    def _assess_cardiac_risk(self, patient_id: UUID, recent_vitals: List[Vitals]) -> Dict:
        """
        Assess cardiac event risk

        Indicators:
        - Arrhythmia patterns (abnormal heart rate variability)
        - Tachycardia (HR > 120) or Bradycardia (HR < 50)
        - Hypertension (BP > 180/110) or Hypotension (BP < 90/60)
        - Associated symptoms from patient history
        """
        if not recent_vitals:
            return {"risk_level": "unknown", "score": 0}

        latest = recent_vitals[-1]
        risk_factors = 0
        details = []
        score = 0

        # Heart rate assessment
        if latest.heart_rate:
            if latest.heart_rate > 140:
                risk_factors += 1
                score += 30
                details.append(f"Severe tachycardia: {latest.heart_rate} bpm")
            elif latest.heart_rate > 120:
                risk_factors += 1
                score += 20
                details.append(f"Tachycardia: {latest.heart_rate} bpm")
            elif latest.heart_rate < 40:
                risk_factors += 1
                score += 30
                details.append(f"Severe bradycardia: {latest.heart_rate} bpm")
            elif latest.heart_rate < 50:
                risk_factors += 1
                score += 20
                details.append(f"Bradycardia: {latest.heart_rate} bpm")

        # Blood pressure assessment
        if latest.blood_pressure_systolic and latest.blood_pressure_diastolic:
            if latest.blood_pressure_systolic > 200 or latest.blood_pressure_diastolic > 120:
                risk_factors += 1
                score += 30
                details.append(f"Hypertensive crisis: {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}")
            elif latest.blood_pressure_systolic > 180 or latest.blood_pressure_diastolic > 110:
                risk_factors += 1
                score += 20
                details.append(f"Hypertension: {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}")
            elif latest.blood_pressure_systolic < 80:
                risk_factors += 1
                score += 30
                details.append(f"Severe hypotension: {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}")
            elif latest.blood_pressure_systolic < 90:
                risk_factors += 1
                score += 20
                details.append(f"Hypotension: {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}")

        # Check for heart rate variability patterns (if multiple vitals)
        if len(recent_vitals) >= 3:
            hr_variability = self._check_hr_variability(recent_vitals)
            if hr_variability["abnormal"]:
                risk_factors += 1
                score += 15
                details.append("Abnormal heart rate variability detected")

        # Determine risk level
        if score >= 60:
            risk_level = "critical"
        elif score >= 40:
            risk_level = "high"
        elif score >= 20:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "risk_level": risk_level,
            "score": min(score, 100),
            "risk_factors": risk_factors,
            "details": details,
            "alert": score >= 40
        }

    def _assess_respiratory_risk(self, recent_vitals: List[Vitals]) -> Dict:
        """
        Assess respiratory distress risk

        Indicators:
        - Low SpO2 (< 90%)
        - Respiratory rate abnormalities (if available)
        """
        if not recent_vitals:
            return {"risk_level": "unknown", "score": 0}

        latest = recent_vitals[-1]
        score = 0
        details = []

        # SpO2 assessment (critical for respiratory function)
        if latest.spo2:
            if latest.spo2 < 85:
                score = 90
                details.append(f"Critical hypoxemia: SpO2 {latest.spo2}%")
            elif latest.spo2 < 90:
                score = 70
                details.append(f"Severe hypoxemia: SpO2 {latest.spo2}%")
            elif latest.spo2 < 94:
                score = 40
                details.append(f"Mild hypoxemia: SpO2 {latest.spo2}%")

        # Determine risk level
        if score >= 70:
            risk_level = "critical"
        elif score >= 50:
            risk_level = "high"
        elif score >= 30:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "risk_level": risk_level,
            "score": score,
            "details": details,
            "alert": score >= 50
        }

    def _assess_shock_risk(self, recent_vitals: List[Vitals]) -> Dict:
        """
        Assess shock risk

        Indicators:
        - Hypotension + Tachycardia
        - Low SpO2
        - Temperature extremes
        """
        if not recent_vitals:
            return {"risk_level": "unknown", "score": 0}

        latest = recent_vitals[-1]
        shock_indicators = 0
        details = []

        # Hypotension
        has_hypotension = False
        if latest.blood_pressure_systolic and latest.blood_pressure_systolic < 90:
            has_hypotension = True
            shock_indicators += 1
            details.append(f"Hypotension: {latest.blood_pressure_systolic} mmHg")

        # Tachycardia
        has_tachycardia = False
        if latest.heart_rate and latest.heart_rate > 110:
            has_tachycardia = True
            shock_indicators += 1
            details.append(f"Tachycardia: {latest.heart_rate} bpm")

        # Low SpO2
        if latest.spo2 and latest.spo2 < 92:
            shock_indicators += 1
            details.append(f"Low oxygen: SpO2 {latest.spo2}%")

        # Temperature extremes
        if latest.temperature:
            if latest.temperature < 36.0 or latest.temperature > 38.5:
                shock_indicators += 1
                details.append(f"Temperature instability: {latest.temperature}°C")

        # Classic shock = hypotension + tachycardia
        if has_hypotension and has_tachycardia:
            score = 85
            risk_level = "critical"
        elif shock_indicators >= 3:
            score = 70
            risk_level = "high"
        elif shock_indicators >= 2:
            score = 50
            risk_level = "moderate"
        elif shock_indicators == 1:
            score = 25
            risk_level = "low"
        else:
            score = 10
            risk_level = "low"

        return {
            "risk_level": risk_level,
            "score": score,
            "shock_indicators": shock_indicators,
            "details": details,
            "alert": shock_indicators >= 2
        }

    def _calculate_mews_score(self, vitals: Vitals) -> Dict:
        """
        Calculate Modified Early Warning Score (MEWS)

        MEWS is a validated clinical scoring system
        Score ranges: 0-14 (higher = worse)
        """
        score = 0
        components = {}

        # Systolic BP
        if vitals.blood_pressure_systolic:
            if vitals.blood_pressure_systolic <= 70:
                score += 3
                components["bp"] = 3
            elif vitals.blood_pressure_systolic <= 80:
                score += 2
                components["bp"] = 2
            elif vitals.blood_pressure_systolic <= 100:
                score += 1
                components["bp"] = 1
            elif vitals.blood_pressure_systolic >= 200:
                score += 2
                components["bp"] = 2
            else:
                components["bp"] = 0

        # Heart Rate
        if vitals.heart_rate:
            if vitals.heart_rate <= 40:
                score += 2
                components["hr"] = 2
            elif vitals.heart_rate <= 50:
                score += 1
                components["hr"] = 1
            elif vitals.heart_rate >= 130:
                score += 3
                components["hr"] = 3
            elif vitals.heart_rate >= 110:
                score += 2
                components["hr"] = 2
            elif vitals.heart_rate >= 100:
                score += 1
                components["hr"] = 1
            else:
                components["hr"] = 0

        # Temperature
        if vitals.temperature:
            if vitals.temperature <= 35.0:
                score += 2
                components["temp"] = 2
            elif vitals.temperature >= 39.0:
                score += 2
                components["temp"] = 2
            elif vitals.temperature >= 38.5:
                score += 1
                components["temp"] = 1
            else:
                components["temp"] = 0

        # SpO2 (if available)
        if vitals.spo2:
            if vitals.spo2 < 85:
                score += 3
                components["spo2"] = 3
            elif vitals.spo2 < 90:
                score += 2
                components["spo2"] = 2
            elif vitals.spo2 < 94:
                score += 1
                components["spo2"] = 1
            else:
                components["spo2"] = 0

        # Interpret score
        if score >= 7:
            risk_level = "critical"
            action = "Immediate ICU assessment required"
        elif score >= 5:
            risk_level = "high"
            action = "Urgent medical review needed"
        elif score >= 3:
            risk_level = "moderate"
            action = "Increased monitoring frequency"
        else:
            risk_level = "low"
            action = "Continue routine monitoring"

        return {
            "score": score,
            "risk_level": risk_level,
            "components": components,
            "action_required": action
        }

    # Helper methods

    def _get_recent_vitals(self, patient_id: UUID, hours: int = 24) -> List[Vitals]:
        """Get vitals from the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        return self.db.query(Vitals).filter(
            and_(
                Vitals.patient_id == patient_id,
                Vitals.recorded_at >= cutoff_time
            )
        ).order_by(Vitals.recorded_at.asc()).all()

    def _check_infection_signs(self, patient_id: UUID) -> bool:
        """Check for signs of infection (simplified)"""
        # In production, would check:
        # - WBC count from lab tests
        # - CRP levels
        # - Procalcitonin
        # - Clinical notes for infection diagnosis

        # For now, check if there are recent lab tests indicating infection
        recent_labs = self.db.query(LabTest).filter(
            and_(
                LabTest.patient_id == patient_id,
                LabTest.test_type.ilike("%infection%"),
                LabTest.status == "completed"
            )
        ).first()

        return recent_labs is not None

    def _check_hr_variability(self, vitals: List[Vitals]) -> Dict:
        """Check for abnormal heart rate variability"""
        hr_values = [v.heart_rate for v in vitals if v.heart_rate]

        if len(hr_values) < 3:
            return {"abnormal": False}

        # Calculate variability
        hr_changes = [abs(hr_values[i] - hr_values[i-1]) for i in range(1, len(hr_values))]
        avg_change = sum(hr_changes) / len(hr_changes)

        # Abnormal if large fluctuations (> 20 bpm average change)
        return {
            "abnormal": avg_change > 20,
            "average_change": round(avg_change, 1)
        }

    def _determine_overall_risk(
        self,
        sepsis: Dict,
        cardiac: Dict,
        respiratory: Dict,
        shock: Dict,
        mews: Dict
    ) -> Dict:
        """Determine overall risk level"""
        # Take the highest risk level
        risk_scores = {
            "sepsis": sepsis["score"],
            "cardiac": cardiac["score"],
            "respiratory": respiratory["score"],
            "shock": shock["score"],
            "mews": mews["score"] * 7  # Normalize MEWS to 0-100 scale
        }

        max_score = max(risk_scores.values())
        primary_concern = max(risk_scores, key=risk_scores.get)

        if max_score >= 80:
            level = "critical"
        elif max_score >= 60:
            level = "high"
        elif max_score >= 40:
            level = "moderate"
        else:
            level = "low"

        return {
            "level": level,
            "score": round(max_score, 1),
            "primary_concern": primary_concern,
            "all_scores": {k: round(v, 1) for k, v in risk_scores.items()}
        }

    def _generate_alerts(
        self,
        patient: Patient,
        sepsis: Dict,
        cardiac: Dict,
        respiratory: Dict,
        shock: Dict,
        overall: Dict
    ) -> List[str]:
        """Generate clinical alerts"""
        alerts = []

        if sepsis.get("alert"):
            alerts.append(f"⚠️ SEPSIS RISK: {sepsis['sirs_criteria_met']} SIRS criteria met")

        if cardiac.get("alert"):
            alerts.append(f"💔 CARDIAC RISK: {', '.join(cardiac['details'][:2])}")

        if respiratory.get("alert"):
            alerts.append(f"🫁 RESPIRATORY DISTRESS: {respiratory['details'][0] if respiratory['details'] else 'Low SpO2'}")

        if shock.get("alert"):
            alerts.append(f"⚡ SHOCK RISK: {shock['shock_indicators']} indicators present")

        return alerts

    def _generate_recommendations(self, overall_risk: Dict, alerts: List[str]) -> List[str]:
        """Generate clinical recommendations"""
        recommendations = []

        if overall_risk["level"] == "critical":
            recommendations.append("🚨 IMMEDIATE ACTION: Contact attending physician urgently")
            recommendations.append("📍 Consider ICU transfer evaluation")
            recommendations.append("🔬 Obtain urgent labs: CBC, CMP, lactate, blood cultures")

        elif overall_risk["level"] == "high":
            recommendations.append("⚠️ Increase monitoring frequency to every 15-30 minutes")
            recommendations.append("🩺 Physician review within 1 hour")
            recommendations.append("💉 Review IV access and consider additional lines")

        elif overall_risk["level"] == "moderate":
            recommendations.append("👀 Increase monitoring frequency to every 1-2 hours")
            recommendations.append("📋 Notify attending physician of status change")

        # Specific recommendations based on primary concern
        primary_concern = overall_risk.get("primary_concern")

        if primary_concern == "sepsis":
            recommendations.append("💧 Consider early fluid resuscitation")
            recommendations.append("💊 Review antibiotic coverage if infection confirmed")

        elif primary_concern == "cardiac":
            recommendations.append("🫀 Obtain 12-lead ECG")
            recommendations.append("🧪 Check cardiac biomarkers (troponin)")

        elif primary_concern == "respiratory":
            recommendations.append("💨 Increase oxygen supplementation")
            recommendations.append("📸 Consider chest X-ray")

        return recommendations

    def _trigger_critical_alerts(
        self,
        patient: Patient,
        overall_risk: Dict,
        alerts: List[str]
    ):
        """Trigger notifications for critical patients"""
        # This would integrate with the notification service
        # to alert doctors, nurses, and rapid response teams
        pass

    def _generate_monitoring_summary(
        self,
        critical: List[Dict],
        high_risk: List[Dict]
    ) -> Dict:
        """Generate summary of monitoring results"""
        return {
            "status": "critical" if critical else "stable",
            "action_required": len(critical) > 0,
            "priority_message": f"{len(critical)} patients require immediate attention" if critical else "No critical patients at this time",
            "recommendations": [
                "Review critical patients immediately",
                "Ensure adequate staffing for high-risk patients",
                "Consider ICU capacity planning"
            ] if critical else []
        }
