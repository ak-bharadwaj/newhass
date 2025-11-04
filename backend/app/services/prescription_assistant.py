"""
AI Prescription Assistant Service using Gemini 2.5 Flash

Provides intelligent prescription suggestions and validation:
1. Before Writing: Suggests medications based on patient conditions
2. After Writing: Validates prescription and suggests alternatives if needed

Features:
- Context-aware medication suggestions
- Drug interaction checking
- Allergy contraindication detection
- Alternative medication recommendations
- Dosage validation
- Evidence-based recommendations
"""
import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from uuid import UUID

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("Google Gemini AI not available for prescription assistance")

from app.models import Patient, Prescription, Vitals

logger = logging.getLogger(__name__)


class PrescriptionAssistant:
    """
    AI-powered prescription assistant using Gemini 2.5 Flash

    Workflow:
    1. Pre-prescription: Suggest medications based on conditions
    2. Post-prescription: Validate and suggest alternatives
    """

    def __init__(self, db: Session):
        self.db = db
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_fallback_key = os.getenv("GEMINI_FALLBACK_API_KEY")

        if GEMINI_AVAILABLE and self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-2.5-flash-latest')
                self.gemini_enabled = True
                logger.info("Gemini AI enabled for prescription assistance")
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}. Using fallback.")
                self.gemini_enabled = False
        else:
            self.gemini_enabled = False
            logger.info("Gemini AI disabled - suggestions unavailable")

    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API with fallback support"""
        if not self.gemini_enabled:
            raise RuntimeError("Gemini AI not available")

        try:
            response = self.gemini_model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,  # Low temperature for medical accuracy
                    "max_output_tokens": 2048,
                    "top_p": 0.8,
                    "top_k": 40
                }
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}")

            # Try fallback key
            if self.gemini_fallback_key:
                try:
                    genai.configure(api_key=self.gemini_fallback_key)
                    fallback_model = genai.GenerativeModel('gemini-2.5-flash-latest')
                    response = fallback_model.generate_content(prompt)
                    return response.text.strip()
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {str(fallback_error)}")

            raise RuntimeError(f"Gemini API call failed: {str(e)}")

    def suggest_prescriptions(
        self,
        patient_id: UUID,
        chief_complaint: Optional[str] = None
    ) -> Dict:
        """
        Suggest medications BEFORE doctor writes prescription
        Based on patient's medical conditions, allergies, and current complaint

        Args:
            patient_id: Patient UUID
            chief_complaint: Current reason for visit (optional)

        Returns:
            Dict with medication suggestions and rationale
        """
        # Get patient data
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return {"error": "Patient not found", "suggestions": []}

        # Get patient age
        age = self._calculate_age(patient.date_of_birth)

        # Get recent vitals
        recent_vitals = self.db.query(Vitals)\
            .filter(Vitals.patient_id == patient_id)\
            .order_by(Vitals.recorded_at.desc())\
            .limit(3)\
            .all()

        # Get current prescriptions
        current_prescriptions = self.db.query(Prescription)\
            .filter(
                Prescription.patient_id == patient_id,
                Prescription.status.in_(['active', 'dispensed'])
            )\
            .all()

        if not self.gemini_enabled:
            return {
                "suggestions": [],
                "message": "AI suggestions unavailable - Gemini not configured",
                "fallback": True
            }

        # Build prompt
        prompt = self._build_suggestion_prompt(
            patient=patient,
            age=age,
            vitals=recent_vitals,
            current_prescriptions=current_prescriptions,
            chief_complaint=chief_complaint
        )

        try:
            response = self._call_gemini(prompt)

            # Parse JSON response
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)

            # Add metadata
            result['generated_at'] = datetime.utcnow().isoformat()
            result['patient_id'] = str(patient_id)
            result['ai_powered'] = True

            return result

        except Exception as e:
            logger.error(f"Prescription suggestion failed: {e}")
            return {
                "suggestions": [],
                "message": f"AI suggestion failed: {str(e)}",
                "error": True
            }

    def validate_prescription(
        self,
        patient_id: UUID,
        medication_name: str,
        dosage: str,
        frequency: str,
        route: str,
        duration_days: Optional[int] = None
    ) -> Dict:
        """
        Validate prescription AFTER doctor writes it
        Check if it's appropriate and suggest alternatives if better options exist

        Args:
            patient_id: Patient UUID
            medication_name: Prescribed medication
            dosage: Dosage (e.g., "500mg")
            frequency: Frequency (e.g., "twice daily")
            route: Route (e.g., "oral")
            duration_days: Duration in days

        Returns:
            Dict with validation result and alternatives if needed
        """
        # Get patient data
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return {"error": "Patient not found", "valid": False}

        age = self._calculate_age(patient.date_of_birth)

        # Get current prescriptions for interaction checking
        current_prescriptions = self.db.query(Prescription)\
            .filter(
                Prescription.patient_id == patient_id,
                Prescription.status.in_(['active', 'dispensed'])
            )\
            .all()

        if not self.gemini_enabled:
            return {
                "valid": True,
                "message": "AI validation unavailable - prescription accepted by default",
                "alternatives": [],
                "warnings": [],
                "fallback": True
            }

        # Build validation prompt
        prompt = self._build_validation_prompt(
            patient=patient,
            age=age,
            medication_name=medication_name,
            dosage=dosage,
            frequency=frequency,
            route=route,
            duration_days=duration_days,
            current_prescriptions=current_prescriptions
        )

        try:
            response = self._call_gemini(prompt)

            # Parse JSON response
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)

            # Add metadata
            result['validated_at'] = datetime.utcnow().isoformat()
            result['prescription'] = {
                'medication': medication_name,
                'dosage': dosage,
                'frequency': frequency,
                'route': route
            }
            result['ai_powered'] = True

            return result

        except Exception as e:
            logger.error(f"Prescription validation failed: {e}")
            return {
                "valid": True,  # Default to valid if AI fails
                "message": f"AI validation failed - prescription accepted by default: {str(e)}",
                "alternatives": [],
                "warnings": [],
                "error": True
            }

    def _build_suggestion_prompt(
        self,
        patient: Patient,
        age: int,
        vitals: List,
        current_prescriptions: List,
        chief_complaint: Optional[str]
    ) -> str:
        """Build prompt for prescription suggestions"""

        # Format medical conditions
        conditions_text = "None documented"
        if patient.medical_conditions:
            if isinstance(patient.medical_conditions, dict):
                conditions_list = patient.medical_conditions.get('conditions', [])
                if conditions_list:
                    conditions_text = ", ".join(conditions_list)
            elif isinstance(patient.medical_conditions, list):
                conditions_text = ", ".join(patient.medical_conditions)

        # Format current medications
        current_meds = []
        for rx in current_prescriptions:
            current_meds.append(f"{rx.medication_name} {rx.dosage} {rx.frequency}")

        prompt = f"""You are a medical AI assistant helping doctors prescribe medications.

Patient Information:
- Age: {age} years
- Gender: {patient.gender}
- Medical Conditions: {conditions_text}
- Known Allergies: {patient.allergies or "None"}
- Current Medications: {', '.join(current_meds) if current_meds else 'None'}

{f"Chief Complaint/Reason for Visit: {chief_complaint}" if chief_complaint else ""}

Recent Vitals:
{json.dumps([{
    'bp': f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if v.blood_pressure_systolic else None,
    'hr': v.heart_rate,
    'temp': v.temperature,
    'spo2': v.spo2
} for v in vitals[:3]], indent=2)}

Task: Suggest appropriate medications for this patient's conditions.

IMPORTANT GUIDELINES:
1. Consider patient's age, gender, conditions, and allergies
2. Check for potential drug interactions with current medications
3. Suggest evidence-based first-line treatments
4. Provide clear rationale for each suggestion
5. Include dosage, frequency, and duration recommendations
6. Flag any contraindications or special precautions

Return ONLY valid JSON with this structure:
{{
    "suggestions": [
        {{
            "medication_name": "<generic name>",
            "dosage": "<e.g., 500mg>",
            "frequency": "<e.g., twice daily>",
            "route": "<e.g., oral>",
            "duration_days": <number>,
            "indication": "<what condition this treats>",
            "rationale": "<why this is recommended>",
            "priority": "<high|medium|low>",
            "evidence_level": "<strong|moderate|limited>",
            "special_instructions": "<any special instructions>",
            "contraindications": [<list any contraindications>],
            "monitoring_required": "<what to monitor, if any>"
        }}
    ],
    "warnings": [<list any important warnings or considerations>],
    "drug_interactions": [<list potential interactions with current medications>],
    "general_recommendations": "<overall treatment approach recommendation>"
}}
"""
        return prompt

    def _build_validation_prompt(
        self,
        patient: Patient,
        age: int,
        medication_name: str,
        dosage: str,
        frequency: str,
        route: str,
        duration_days: Optional[int],
        current_prescriptions: List
    ) -> str:
        """Build prompt for prescription validation"""

        # Format medical conditions
        conditions_text = "None documented"
        if patient.medical_conditions:
            if isinstance(patient.medical_conditions, dict):
                conditions_list = patient.medical_conditions.get('conditions', [])
                if conditions_list:
                    conditions_text = ", ".join(conditions_list)
            elif isinstance(patient.medical_conditions, list):
                conditions_text = ", ".join(patient.medical_conditions)

        # Format current medications
        current_meds = []
        for rx in current_prescriptions:
            current_meds.append(f"{rx.medication_name} {rx.dosage} {rx.frequency}")

        prompt = f"""You are a medical AI assistant validating a prescription.

Patient Information:
- Age: {age} years
- Gender: {patient.gender}
- Medical Conditions: {conditions_text}
- Known Allergies: {patient.allergies or "None"}
- Current Medications: {', '.join(current_meds) if current_meds else 'None'}

Prescription to Validate:
- Medication: {medication_name}
- Dosage: {dosage}
- Frequency: {frequency}
- Route: {route}
- Duration: {duration_days} days

Task: Validate this prescription and suggest alternatives if better options exist.

VALIDATION CRITERIA:
1. Is the medication appropriate for patient's conditions?
2. Is the dosage correct for patient's age and weight?
3. Are there any contraindications (allergies, conditions)?
4. Are there potential drug interactions with current medications?
5. Is there a better/safer alternative available?
6. Is the frequency and route appropriate?

Return ONLY valid JSON with this structure:
{{
    "valid": <true|false>,
    "appropriateness_score": <0-100>,
    "issues": [
        {{
            "severity": "<critical|high|moderate|low>",
            "type": "<allergy|interaction|contraindication|dosage|better_alternative>",
            "description": "<detailed description>",
            "recommendation": "<what to do about it>"
        }}
    ],
    "alternatives": [
        {{
            "medication_name": "<alternative drug>",
            "dosage": "<recommended dosage>",
            "frequency": "<recommended frequency>",
            "route": "<route>",
            "advantage": "<why this is better>",
            "evidence": "<supporting evidence>",
            "priority": "<high|medium|low>"
        }}
    ],
    "warnings": [<list of warnings if proceeding with original prescription>],
    "approval_recommendation": "<approve|modify|reject>",
    "summary": "<brief summary of validation>"
}}
"""
        return prompt

    def _calculate_age(self, date_of_birth) -> int:
        """Calculate age from date of birth"""
        from datetime import date
        today = date.today()
        return today.year - date_of_birth.year - (
            (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
        )
