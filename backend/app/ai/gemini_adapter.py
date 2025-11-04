"""
Gemini adapter for production AI features using Google Gemini 2.5 Flash
"""
import os
import json
import logging
from typing import Dict, Any
from .adapter import AIAdapter

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("google-generativeai package not installed")


logger = logging.getLogger(__name__)


class GeminiAdapter(AIAdapter):
    """
    Production adapter using Google Gemini 2.5 Flash API
    Requires GEMINI_API_KEY environment variable
    """

    def __init__(self):
        if not GEMINI_AVAILABLE:
            raise RuntimeError("google-generativeai package not installed. Install with: pip install google-generativeai")

        # Primary API key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        # Fallback API key
        self.fallback_key = os.getenv("GEMINI_FALLBACK_API_KEY")

        # Configure Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-latest')
        self.model_name = 'gemini-2.5-flash-latest'

        logger.info(f"Gemini adapter initialized with model: {self.model_name}")

    async def _call_gemini(self, prompt: str, retry_with_fallback: bool = True) -> str:
        """Helper to call Gemini API with error handling"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,  # Lower temperature for more consistent medical responses
                    "max_output_tokens": 2048,
                    "top_p": 0.8,
                    "top_k": 40
                }
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}")

            # Try fallback API key if available
            if retry_with_fallback and self.fallback_key:
                try:
                    logger.info("Retrying with fallback Gemini API key")
                    genai.configure(api_key=self.fallback_key)
                    fallback_model = genai.GenerativeModel('gemini-2.5-flash-latest')
                    response = fallback_model.generate_content(prompt)
                    return response.text.strip()
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {str(fallback_error)}")

            raise RuntimeError(f"Gemini API call failed: {str(e)}")

    async def generate_risk_score(
        self,
        patient_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate risk score using Gemini 2.5 Flash"""

        prompt = f"""You are a medical AI assistant specializing in patient risk assessment.
Analyze the provided patient data and return a risk score with supporting information.

Patient Data:
- Age: {patient_data.get('age', 'Unknown')}
- Gender: {patient_data.get('gender', 'Unknown')}
- Allergies: {patient_data.get('allergies', 'None')}

Recent Vitals (last 5 readings):
{json.dumps(vitals_data[:5], indent=2)}

Recent Lab Results:
{json.dumps(lab_results[:5], indent=2)}

Provide a comprehensive risk assessment in JSON format with:
- risk_score: integer from 0-100 (0=no risk, 100=critical risk)
- confidence: float from 0.0-1.0
- factors: list of specific risk factors identified
- recommendations: list of clinical recommendations

Return ONLY valid JSON with this exact structure:
{{
    "risk_score": <integer 0-100>,
    "confidence": <float 0.0-1.0>,
    "factors": [<list of risk factors>],
    "recommendations": [<list of recommendations>]
}}
"""

        try:
            response = await self._call_gemini(prompt)

            # Parse JSON response
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)

            # Validate structure
            if not all(key in result for key in ["risk_score", "confidence", "factors", "recommendations"]):
                raise ValueError("Incomplete response structure")

            return result

        except Exception as e:
            logger.error(f"Risk score generation failed: {e}")
            # Fallback to basic structure
            return {
                "risk_score": 50,
                "confidence": 0.5,
                "factors": [f"Unable to generate AI risk assessment: {str(e)}"],
                "recommendations": ["Manual review required by physician"]
            }

    async def generate_discharge_summary(
        self,
        visit_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        prescriptions: list[Dict[str, Any]],
        lab_tests: list[Dict[str, Any]],
        nurse_logs: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate discharge summary using Gemini 2.5 Flash"""

        prompt = f"""You are a medical AI assistant creating hospital discharge summaries.
Generate a comprehensive but concise discharge summary based on the visit data provided.

Visit Details:
- Reason for Visit: {visit_data.get('reason_for_visit', 'Unknown')}
- Primary Diagnosis: {visit_data.get('diagnosis', 'Under observation')}
- Admission Date: {visit_data.get('admission_date', 'Unknown')}
- Length of Stay: {visit_data.get('length_of_stay', 'Unknown')} days

Clinical Data Summary:
- Vital Signs Recorded: {len(vitals_data)} readings
- Lab Tests Performed: {len(lab_tests)} tests
- Nursing Log Entries: {len(nurse_logs)} entries

Prescribed Medications:
{json.dumps([{{
    'medication': rx.get('medication_name'),
    'dosage': rx.get('dosage'),
    'frequency': rx.get('frequency'),
    'route': rx.get('route', 'oral')
}} for rx in prescriptions[:10]], indent=2)}

Generate a structured discharge summary in JSON format with:
- summary: A narrative summary paragraph (2-3 sentences)
- diagnoses: List of diagnoses (primary and secondary)
- procedures: List of procedures performed during stay
- medications: List of discharge medications with instructions
- follow_up: Follow-up care instructions

Return ONLY valid JSON with this exact structure:
{{
    "summary": "<concise narrative summary>",
    "diagnoses": [<list of diagnoses>],
    "procedures": [<list of procedures>],
    "medications": [<list of medications with dosages>],
    "follow_up": "<follow-up instructions>"
}}
"""

        try:
            response = await self._call_gemini(prompt)

            # Parse JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result

        except Exception as e:
            logger.error(f"Discharge summary generation failed: {e}")
            return {
                "summary": "Patient was admitted, treated, and is now being discharged. Detailed summary generation failed - manual review required.",
                "diagnoses": [visit_data.get('diagnosis', 'Under observation')],
                "procedures": ["Manual documentation required"],
                "medications": [rx.get('medication_name', 'Unknown') for rx in prescriptions[:5]],
                "follow_up": "Follow up with primary care physician within 1-2 weeks"
            }

    async def generate_treatment_plan(
        self,
        patient_data: Dict[str, Any],
        symptoms: str,
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate treatment plan using Gemini 2.5 Flash"""

        prompt = f"""You are a medical AI assistant providing treatment plan suggestions for physician review.
IMPORTANT: These are suggestions only, not direct medical advice. All recommendations require physician approval.

Patient Information:
- Age: {patient_data.get('age', 'Unknown')}
- Gender: {patient_data.get('gender', 'Unknown')}
- Known Allergies: {patient_data.get('allergies', 'None reported')}

Presenting Symptoms:
{symptoms}

Recent Vital Signs:
{json.dumps(vitals_data[:3], indent=2)}

Recent Lab Results:
{json.dumps(lab_results[:5], indent=2)}

Generate a comprehensive treatment plan suggestion in JSON format with:
- primary_diagnosis: Most likely diagnosis based on symptoms and data
- differential_diagnoses: List of alternative possible diagnoses
- recommended_tests: Additional tests needed for confirmation
- treatment_options: Array of treatment approaches with details and evidence levels
- precautions: Important precautions and contraindications

Return ONLY valid JSON with this exact structure:
{{
    "primary_diagnosis": "<most likely diagnosis>",
    "differential_diagnoses": [<list of alternative diagnoses>],
    "recommended_tests": [<list of recommended tests>],
    "treatment_options": [
        {{
            "option": "<treatment name>",
            "details": "<treatment details>",
            "evidence": "<evidence level: high|moderate|low>"
        }}
    ],
    "precautions": [<list of precautions>]
}}
"""

        try:
            response = await self._call_gemini(prompt)

            # Parse JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result

        except Exception as e:
            logger.error(f"Treatment plan generation failed: {e}")
            return {
                "primary_diagnosis": "Further evaluation required",
                "differential_diagnoses": ["Multiple possibilities - detailed assessment needed"],
                "recommended_tests": ["Complete Blood Count", "Basic Metabolic Panel", "Relevant imaging"],
                "treatment_options": [{
                    "option": "Supportive care",
                    "details": "Symptomatic treatment pending definitive diagnosis",
                    "evidence": "standard_practice"
                }],
                "precautions": ["Monitor patient closely", "AI generation failed - manual treatment planning required"]
            }

    async def detect_vitals_anomaly(
        self,
        vitals_data: list[Dict[str, Any]],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect vitals anomalies using Gemini 2.5 Flash"""

        prompt = f"""You are a medical AI assistant monitoring patient vital signs for dangerous patterns.
Analyze the provided vitals data and identify any anomalies or concerning trends.

Patient Context:
- Age: {patient_context.get('age', 'Unknown')}
- Gender: {patient_context.get('gender', 'Unknown')}
- Medical History: {patient_context.get('medical_history', 'Not provided')}

Latest Vital Signs:
{json.dumps(vitals_data[:1], indent=2)}

Recent Trend (last 5 readings):
{json.dumps(vitals_data[:5], indent=2)}

Analyze for:
- Dangerous vital sign values (hypertension, hypothermia, tachycardia, etc.)
- Concerning trends (rapid deterioration, unstable patterns)
- Emergency situations requiring immediate intervention

Return ONLY valid JSON with this exact structure:
{{
    "is_anomalous": <boolean>,
    "severity": "<low|medium|high|critical>",
    "anomalies": [<list of specific anomalies detected>],
    "recommended_actions": [<list of recommended clinical actions>]
}}
"""

        try:
            response = await self._call_gemini(prompt)

            # Parse JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result

        except Exception as e:
            logger.error(f"Vitals anomaly detection failed: {e}")
            return {
                "is_anomalous": False,
                "severity": "low",
                "anomalies": [f"AI analysis unavailable: {str(e)}"],
                "recommended_actions": ["Manual vitals review required", "Use threshold-based monitoring as backup"]
            }
