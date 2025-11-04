"""
OpenAI adapter for production AI features
"""
import os
import json
from typing import Dict, Any
from .adapter import AIAdapter

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class OpenAIAdapter(AIAdapter):
    """
    Production adapter using OpenAI GPT-4 API
    Requires OPENAI_API_KEY environment variable
    """

    def __init__(self):
        if not OPENAI_AVAILABLE:
            raise RuntimeError("openai package not installed. Install with: pip install openai")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        """Helper to call OpenAI API with error handling"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent medical responses
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"OpenAI API call failed: {str(e)}")

    async def generate_risk_score(
        self,
        patient_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate risk score using OpenAI"""

        system_prompt = """You are a medical AI assistant specializing in patient risk assessment.
Analyze the provided patient data and return a risk score with supporting information.
Return ONLY valid JSON with this exact structure:
{
    "risk_score": <integer 0-100>,
    "confidence": <float 0.0-1.0>,
    "factors": [<list of risk factors>],
    "recommendations": [<list of recommendations>]
}"""

        user_prompt = f"""Analyze this patient data and provide a risk score:

Patient Age: {patient_data.get('age', 'Unknown')}
Gender: {patient_data.get('gender', 'Unknown')}
Allergies: {patient_data.get('allergies', 'None')}

Recent Vitals (last 5):
{json.dumps(vitals_data[:5], indent=2)}

Recent Lab Results:
{json.dumps(lab_results[:5], indent=2)}

Provide risk assessment in JSON format."""

        response = await self._call_openai(system_prompt, user_prompt)

        # Parse JSON response
        try:
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # Fallback to basic structure if parsing fails
            return {
                "risk_score": 50,
                "confidence": 0.5,
                "factors": ["Unable to parse AI response"],
                "recommendations": ["Manual review required"]
            }

    async def generate_discharge_summary(
        self,
        visit_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        prescriptions: list[Dict[str, Any]],
        lab_tests: list[Dict[str, Any]],
        nurse_logs: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate discharge summary using OpenAI"""

        system_prompt = """You are a medical AI assistant creating discharge summaries.
Generate a comprehensive but concise discharge summary based on the visit data.
Return ONLY valid JSON with this exact structure:
{
    "summary": "<narrative summary>",
    "diagnoses": [<list of diagnoses>],
    "procedures": [<list of procedures>],
    "medications": [<list of medications>],
    "follow_up": "<follow-up instructions>"
}"""

        user_prompt = f"""Create discharge summary for this hospital visit:

Visit Details:
Reason: {visit_data.get('reason_for_visit', 'Unknown')}
Diagnosis: {visit_data.get('diagnosis', 'Under observation')}
Admission Date: {visit_data.get('admission_date', 'Unknown')}

Vitals Recorded: {len(vitals_data)} readings
Lab Tests: {len(lab_tests)} tests performed
Nursing Logs: {len(nurse_logs)} entries

Prescriptions:
{json.dumps([{
    'medication': rx.get('medication_name'),
    'dosage': rx.get('dosage'),
    'frequency': rx.get('frequency')
} for rx in prescriptions[:10]], indent=2)}

Generate discharge summary in JSON format."""

        response = await self._call_openai(system_prompt, user_prompt)

        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            return {
                "summary": "Discharge summary generation failed. Manual review required.",
                "diagnoses": [visit_data.get('diagnosis', 'Under observation')],
                "procedures": ["Manual documentation required"],
                "medications": [rx.get('medication_name', 'Unknown') for rx in prescriptions[:5]],
                "follow_up": "Follow up with primary care physician"
            }

    async def generate_treatment_plan(
        self,
        patient_data: Dict[str, Any],
        symptoms: str,
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate treatment plan using OpenAI"""

        system_prompt = """You are a medical AI assistant providing treatment plan suggestions.
IMPORTANT: These are suggestions for physician review, not direct medical advice.
Return ONLY valid JSON with this exact structure:
{
    "primary_diagnosis": "<most likely diagnosis>",
    "differential_diagnoses": [<list of alternative diagnoses>],
    "recommended_tests": [<list of tests>],
    "treatment_options": [
        {
            "option": "<treatment name>",
            "details": "<details>",
            "evidence": "<evidence level>"
        }
    ],
    "precautions": [<list of precautions>]
}"""

        user_prompt = f"""Suggest treatment plan for:

Patient Age: {patient_data.get('age', 'Unknown')}
Gender: {patient_data.get('gender', 'Unknown')}

Presenting Symptoms: {symptoms}

Recent Vitals:
{json.dumps(vitals_data[:3], indent=2)}

Lab Results:
{json.dumps(lab_results[:5], indent=2)}

Provide treatment suggestions in JSON format."""

        response = await self._call_openai(system_prompt, user_prompt)

        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            return {
                "primary_diagnosis": "Further evaluation required",
                "differential_diagnoses": [],
                "recommended_tests": ["Complete Blood Count", "Basic Metabolic Panel"],
                "treatment_options": [{
                    "option": "Supportive care",
                    "details": "Symptomatic treatment pending diagnosis",
                    "evidence": "Standard practice"
                }],
                "precautions": ["Monitor patient closely", "Manual review required"]
            }

    async def detect_vitals_anomaly(
        self,
        vitals_data: list[Dict[str, Any]],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect vitals anomalies using OpenAI"""

        system_prompt = """You are a medical AI assistant monitoring patient vital signs.
Analyze vitals for dangerous patterns or anomalies.
Return ONLY valid JSON with this exact structure:
{
    "is_anomalous": <boolean>,
    "severity": "<low|medium|high|critical>",
    "anomalies": [<list of specific anomalies>],
    "recommended_actions": [<list of actions>]
}"""

        user_prompt = f"""Analyze these vital signs for anomalies:

Patient Age: {patient_context.get('age', 'Unknown')}

Latest Vitals:
{json.dumps(vitals_data[:1], indent=2)}

Recent Trend (last 5):
{json.dumps(vitals_data[:5], indent=2)}

Identify any dangerous patterns in JSON format."""

        response = await self._call_openai(system_prompt, user_prompt)

        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            return {
                "is_anomalous": False,
                "severity": "low",
                "anomalies": ["Unable to analyze"],
                "recommended_actions": ["Manual review required"]
            }
