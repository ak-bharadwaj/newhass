"""
Development AI adapter providing deterministic responses for testing
"""
from typing import Dict, Any
from .adapter import AIAdapter


class DevAIAdapter(AIAdapter):
    """
    Development adapter that returns plausible deterministic responses
    No external API calls, works offline
    """

    async def generate_risk_score(
        self,
        patient_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate deterministic risk score based on simple heuristics"""

        risk_score = 20  # Base score
        factors = []
        recommendations = []

        # Check age
        age = patient_data.get("age", 0)
        if age > 65:
            risk_score += 15
            factors.append("Age over 65")
            recommendations.append("Regular monitoring recommended for elderly patients")

        # Check vitals for abnormalities
        if vitals_data:
            latest_vitals = vitals_data[0]

            temp = latest_vitals.get("temperature")
            if temp and (temp > 38.5 or temp < 36.0):
                risk_score += 10
                factors.append("Abnormal body temperature")
                recommendations.append("Monitor temperature closely")

            hr = latest_vitals.get("heart_rate")
            if hr and (hr > 100 or hr < 60):
                risk_score += 10
                factors.append("Abnormal heart rate")
                recommendations.append("Consider cardiac evaluation")

            spo2 = latest_vitals.get("spo2")
            if spo2 and spo2 < 95:
                risk_score += 15
                factors.append("Low oxygen saturation")
                recommendations.append("Oxygen therapy may be required")

        # Check for abnormal lab results
        if lab_results:
            abnormal_count = sum(1 for lab in lab_results if lab.get("is_abnormal"))
            if abnormal_count > 0:
                risk_score += abnormal_count * 5
                factors.append(f"{abnormal_count} abnormal lab result(s)")
                recommendations.append("Review lab results with specialist")

        # Cap at 100
        risk_score = min(risk_score, 100)

        # Default recommendations
        if not recommendations:
            recommendations = [
                "Continue routine monitoring",
                "Maintain current treatment plan",
                "Schedule follow-up appointment"
            ]

        confidence = 0.75 if len(vitals_data) > 5 and len(lab_results) > 2 else 0.60

        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "factors": factors or ["No significant risk factors identified"],
            "recommendations": recommendations
        }

    async def generate_discharge_summary(
        self,
        visit_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        prescriptions: list[Dict[str, Any]],
        lab_tests: list[Dict[str, Any]],
        nurse_logs: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate deterministic discharge summary"""

        reason = visit_data.get("reason_for_visit", "General consultation")
        diagnosis = visit_data.get("diagnosis", "Under observation")

        summary = f"""
Patient admitted for {reason}.

Clinical Course:
The patient was monitored throughout the stay with regular vitals checks and appropriate interventions.
{len(vitals_data)} vital sign recordings were performed during the admission.
{len(lab_tests)} laboratory investigations were conducted.
{len(nurse_logs)} nursing observations were documented.

Condition at Discharge:
The patient's condition has stabilized and is deemed suitable for discharge with appropriate follow-up care.

Diagnosis: {diagnosis}
        """.strip()

        diagnoses = [diagnosis] if diagnosis != "Under observation" else []

        medications = [
            f"{rx.get('medication_name', 'Unknown')} {rx.get('dosage', '')} - {rx.get('frequency', '')}"
            for rx in prescriptions[:5]
        ]

        procedures = []
        if len(lab_tests) > 0:
            procedures.append("Laboratory investigations performed")
        if len(vitals_data) > 10:
            procedures.append("Continuous vital signs monitoring")

        follow_up = """
1. Schedule follow-up appointment in 7-10 days
2. Continue prescribed medications as directed
3. Monitor for any concerning symptoms
4. Maintain adequate rest and nutrition
5. Return to emergency if symptoms worsen
        """.strip()

        return {
            "summary": summary,
            "diagnoses": diagnoses,
            "procedures": procedures or ["Observation and monitoring"],
            "medications": medications,
            "follow_up": follow_up
        }

    async def generate_treatment_plan(
        self,
        patient_data: Dict[str, Any],
        symptoms: str,
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate deterministic treatment plan"""

        # Simple keyword-based diagnosis (for dev mode)
        symptoms_lower = symptoms.lower()

        primary_diagnosis = "Condition requiring further evaluation"
        differential_diagnoses = []
        recommended_tests = []
        treatment_options = []

        if "fever" in symptoms_lower or "temperature" in symptoms_lower:
            primary_diagnosis = "Febrile illness - etiology to be determined"
            differential_diagnoses = [
                "Viral infection",
                "Bacterial infection",
                "Inflammatory condition"
            ]
            recommended_tests = [
                "Complete Blood Count (CBC)",
                "Blood culture",
                "C-Reactive Protein (CRP)"
            ]
            treatment_options = [
                {
                    "option": "Antipyretic therapy",
                    "details": "Acetaminophen 500-1000mg every 6 hours as needed",
                    "evidence": "Standard first-line treatment for fever"
                },
                {
                    "option": "Hydration",
                    "details": "Oral or IV fluids as tolerated",
                    "evidence": "Essential for fever management"
                }
            ]

        elif "pain" in symptoms_lower or "chest" in symptoms_lower:
            primary_diagnosis = "Pain syndrome requiring investigation"
            differential_diagnoses = [
                "Musculoskeletal pain",
                "Inflammatory condition",
                "Referred pain"
            ]
            recommended_tests = [
                "Complete Blood Count",
                "ECG",
                "Chest X-ray if indicated"
            ]
            treatment_options = [
                {
                    "option": "Analgesic therapy",
                    "details": "NSAIDs or acetaminophen as appropriate",
                    "evidence": "Standard pain management approach"
                },
                {
                    "option": "Rest and monitoring",
                    "details": "Activity modification with close observation",
                    "evidence": "Conservative management approach"
                }
            ]

        else:
            recommended_tests = [
                "Complete Blood Count (CBC)",
                "Basic Metabolic Panel",
                "Urinalysis"
            ]
            treatment_options = [
                {
                    "option": "Supportive care",
                    "details": "Symptomatic treatment and monitoring",
                    "evidence": "Standard approach pending diagnosis"
                }
            ]

        precautions = [
            "Monitor vital signs regularly",
            "Ensure adequate hydration",
            "Watch for warning signs requiring immediate attention",
            "Follow up within 48-72 hours if symptoms persist"
        ]

        return {
            "primary_diagnosis": primary_diagnosis,
            "differential_diagnoses": differential_diagnoses,
            "recommended_tests": recommended_tests,
            "treatment_options": treatment_options,
            "precautions": precautions
        }

    async def detect_vitals_anomaly(
        self,
        vitals_data: list[Dict[str, Any]],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect anomalies using simple thresholds"""

        if not vitals_data:
            return {
                "is_anomalous": False,
                "severity": "low",
                "anomalies": [],
                "recommended_actions": []
            }

        latest = vitals_data[0]
        anomalies = []
        severity = "low"

        # Temperature checks
        temp = latest.get("temperature")
        if temp:
            if temp > 39.5:
                anomalies.append(f"High fever detected: {temp}°C")
                severity = "high"
            elif temp > 38.5:
                anomalies.append(f"Elevated temperature: {temp}°C")
                severity = max(severity, "medium")
            elif temp < 35.5:
                anomalies.append(f"Hypothermia detected: {temp}°C")
                severity = "high"

        # Heart rate checks
        hr = latest.get("heart_rate")
        if hr:
            if hr > 120:
                anomalies.append(f"Tachycardia detected: {hr} bpm")
                severity = "high"
            elif hr > 100:
                anomalies.append(f"Elevated heart rate: {hr} bpm")
                severity = max(severity, "medium")
            elif hr < 50:
                anomalies.append(f"Bradycardia detected: {hr} bpm")
                severity = "high"

        # Blood pressure checks
        bp_sys = latest.get("blood_pressure_systolic")
        bp_dia = latest.get("blood_pressure_diastolic")
        if bp_sys and bp_dia:
            if bp_sys > 180 or bp_dia > 110:
                anomalies.append(f"Hypertensive crisis: {bp_sys}/{bp_dia} mmHg")
                severity = "critical"
            elif bp_sys > 140 or bp_dia > 90:
                anomalies.append(f"Elevated blood pressure: {bp_sys}/{bp_dia} mmHg")
                severity = max(severity, "medium")
            elif bp_sys < 90:
                anomalies.append(f"Hypotension: {bp_sys}/{bp_dia} mmHg")
                severity = "high"

        # SpO2 checks
        spo2 = latest.get("spo2")
        if spo2:
            if spo2 < 90:
                anomalies.append(f"Severe hypoxia: SpO2 {spo2}%")
                severity = "critical"
            elif spo2 < 95:
                anomalies.append(f"Low oxygen saturation: SpO2 {spo2}%")
                severity = max(severity, "high")

        # Respiratory rate checks
        rr = latest.get("respiratory_rate")
        if rr:
            if rr > 24 or rr < 12:
                anomalies.append(f"Abnormal respiratory rate: {rr} breaths/min")
                severity = max(severity, "medium")

        # Generate recommended actions based on severity
        recommended_actions = []
        if severity == "critical":
            recommended_actions = [
                "Alert attending physician immediately",
                "Prepare emergency response team",
                "Initiate continuous monitoring",
                "Document all interventions"
            ]
        elif severity == "high":
            recommended_actions = [
                "Notify attending physician promptly",
                "Increase monitoring frequency",
                "Reassess patient condition",
                "Prepare for potential intervention"
            ]
        elif severity == "medium":
            recommended_actions = [
                "Continue monitoring",
                "Notify physician during rounds",
                "Document findings in patient chart"
            ]
        else:
            recommended_actions = [
                "Continue routine monitoring"
            ]

        return {
            "is_anomalous": len(anomalies) > 0,
            "severity": severity,
            "anomalies": anomalies,
            "recommended_actions": recommended_actions
        }
