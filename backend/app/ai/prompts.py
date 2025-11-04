"""
AI prompts with PII sanitization utilities
"""
from typing import Dict, Any
import hashlib


def sanitize_patient_name(name: str) -> str:
    """Replace patient name with token"""
    if not name:
        return "PATIENT"
    # Create consistent token from name hash
    name_hash = hashlib.md5(name.encode()).hexdigest()[:8]
    return f"PATIENT_{name_hash.upper()}"


def sanitize_patient_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove or tokenize PII from patient data before sending to external LLM

    Keeps: age, gender, medical data
    Removes/tokenizes: names, addresses, phone, email, MRN
    """
    sanitized = data.copy()

    # Remove direct identifiers
    pii_fields = [
        'first_name', 'last_name', 'email', 'phone',
        'address', 'mrn', 'emergency_contact_name',
        'emergency_contact_phone'
    ]

    for field in pii_fields:
        if field in sanitized:
            if field in ['first_name', 'last_name']:
                # Keep tokenized version for clarity in prompts
                sanitized[field] = f"[REDACTED_{field.upper()}]"
            else:
                del sanitized[field]

    # Keep medical data (age, gender, allergies, medical history)
    # These are necessary for accurate medical AI analysis

    return sanitized


def sanitize_visit_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize visit data"""
    sanitized = data.copy()

    # Remove patient-specific identifiers but keep medical data
    if 'patient_id' in sanitized:
        sanitized['patient_id'] = '[REDACTED_PATIENT_ID]'

    # Keep reason_for_visit, diagnosis, dates as these are medical data

    return sanitized


def sanitize_vitals_data(vitals_list: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Sanitize vitals data"""
    sanitized = []
    for vitals in vitals_list:
        v = vitals.copy()
        # Remove identifiers
        if 'patient_id' in v:
            v['patient_id'] = '[REDACTED]'
        if 'recorded_by_id' in v:
            v['recorded_by_id'] = '[REDACTED]'
        sanitized.append(v)
    return sanitized


def sanitize_lab_results(labs_list: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Sanitize lab results"""
    sanitized = []
    for lab in labs_list:
        l = lab.copy()
        # Remove identifiers but keep test type and results
        if 'patient_id' in l:
            l['patient_id'] = '[REDACTED]'
        if 'requested_by_id' in l:
            l['requested_by_id'] = '[REDACTED]'
        if 'assigned_to_id' in l:
            l['assigned_to_id'] = '[REDACTED]'
        # Remove file URLs that might contain identifying info
        if 'result_file_url' in l:
            l['result_file_url'] = '[REDACTED_URL]'
        sanitized.append(l)
    return sanitized


def sanitize_prescriptions(rx_list: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Sanitize prescription data"""
    sanitized = []
    for rx in rx_list:
        r = rx.copy()
        # Remove identifiers but keep medication data
        if 'patient_id' in r:
            r['patient_id'] = '[REDACTED]'
        if 'prescribed_by_id' in r:
            r['prescribed_by_id'] = '[REDACTED]'
        if 'dispensed_by_id' in r:
            r['dispensed_by_id'] = '[REDACTED]'
        sanitized.append(r)
    return sanitized


def sanitize_nurse_logs(logs_list: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Sanitize nurse logs"""
    sanitized = []
    for log in logs_list:
        l = log.copy()
        # Remove identifiers
        if 'patient_id' in l:
            l['patient_id'] = '[REDACTED]'
        if 'nurse_id' in l:
            l['nurse_id'] = '[REDACTED]'
        # Keep log content as it's medical observation
        sanitized.append(l)
    return sanitized


# Prompt templates
RISK_SCORE_SYSTEM_PROMPT = """You are a medical AI assistant specializing in patient risk assessment.
Your role is to analyze patient data and provide a risk score with supporting information.

IMPORTANT PRIVACY NOTICE:
- All personally identifiable information has been removed from this data
- Patient names and identifiers have been redacted
- Focus only on medical data for analysis

Return ONLY valid JSON with this exact structure:
{
    "risk_score": <integer 0-100>,
    "confidence": <float 0.0-1.0>,
    "factors": [<list of risk factors as strings>],
    "recommendations": [<list of clinical recommendations as strings>]
}

Risk Score Guidelines:
- 0-25: Low risk
- 26-50: Moderate risk
- 51-75: High risk
- 76-100: Critical risk
"""

DISCHARGE_SUMMARY_SYSTEM_PROMPT = """You are a medical AI assistant creating discharge summaries.
Generate a comprehensive but concise discharge summary based on the visit data.

IMPORTANT PRIVACY NOTICE:
- All personally identifiable information has been removed from this data
- Focus only on medical information

Return ONLY valid JSON with this exact structure:
{
    "summary": "<narrative summary of the hospital stay>",
    "diagnoses": [<list of diagnoses as strings>],
    "procedures": [<list of procedures performed as strings>],
    "medications": [<list of discharge medications as strings>],
    "follow_up": "<follow-up care instructions>"
}
"""

TREATMENT_PLAN_SYSTEM_PROMPT = """You are a medical AI assistant providing treatment plan suggestions.

CRITICAL DISCLAIMER:
- These are suggestions for physician review only
- Not direct medical advice
- Final decisions must be made by licensed physicians

PRIVACY NOTICE:
- All personally identifiable information has been removed

Return ONLY valid JSON with this exact structure:
{
    "primary_diagnosis": "<most likely diagnosis>",
    "differential_diagnoses": [<list of alternative diagnoses>],
    "recommended_tests": [<list of diagnostic tests>],
    "treatment_options": [
        {
            "option": "<treatment name>",
            "details": "<treatment details>",
            "evidence": "<evidence level>"
        }
    ],
    "precautions": [<list of clinical precautions>]
}
"""

VITALS_ANOMALY_SYSTEM_PROMPT = """You are a medical AI assistant monitoring patient vital signs.
Analyze vitals for dangerous patterns or anomalies that require clinical attention.

PRIVACY NOTICE:
- Patient identifiers have been removed

Return ONLY valid JSON with this exact structure:
{
    "is_anomalous": <boolean>,
    "severity": "<low|medium|high|critical>",
    "anomalies": [<list of specific anomalies identified>],
    "recommended_actions": [<list of recommended clinical actions>]
}

Severity Guidelines:
- low: Minor deviations, routine monitoring
- medium: Notable abnormalities, notify physician during rounds
- high: Significant abnormalities, prompt physician notification
- critical: Life-threatening values, immediate intervention required
"""
