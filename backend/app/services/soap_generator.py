"""
SOAP Note Generator from Doctor Dictation

Converts doctor's voice dictation into structured SOAP notes:
- S: Subjective (patient's complaints, symptoms)
- O: Objective (vital signs, examination findings)
- A: Assessment (diagnosis, differential diagnosis)
- P: Plan (treatment plan, prescriptions, follow-up)

Uses Google Gemini AI to intelligently parse and structure dictation
"""
import os
import logging
from typing import Dict, Optional
from datetime import datetime

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("Google Gemini AI not available for SOAP note generation")


logger = logging.getLogger(__name__)


class SOAPGenerator:
    """
    AI-powered SOAP note generator from dictation

    Takes free-form doctor dictation and converts to structured SOAP format
    """

    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_fallback_key = os.getenv("GEMINI_FALLBACK_API_KEY")

        if GEMINI_AVAILABLE and self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-2.5-flash-latest')
                self.gemini_enabled = True
                logger.info("Gemini AI enabled for SOAP note generation")
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}. Using template fallback.")
                self.gemini_enabled = False
        else:
            self.gemini_enabled = False

    def generate_soap_note(
        self,
        dictation: str,
        patient_context: Optional[Dict] = None,
        previous_notes: Optional[str] = None
    ) -> Dict:
        """
        Generate structured SOAP note from dictation

        Args:
            dictation: Free-form doctor dictation text
            patient_context: Optional patient context (name, age, chief complaint)
            previous_notes: Optional previous SOAP notes for context

        Returns:
            Dict with structured SOAP note components
        """
        if not dictation or len(dictation.strip()) < 10:
            return {
                "error": "Dictation too short. Please provide more details.",
                "success": False
            }

        if self.gemini_enabled:
            return self._generate_with_gemini(dictation, patient_context, previous_notes)
        else:
            return self._generate_with_template(dictation, patient_context)

    def _generate_with_gemini(
        self,
        dictation: str,
        patient_context: Optional[Dict],
        previous_notes: Optional[str]
    ) -> Dict:
        """Generate SOAP note using Gemini AI"""
        try:
            prompt = self._build_soap_prompt(dictation, patient_context, previous_notes)

            response = self.gemini_model.generate_content(prompt)
            soap_text = response.text.strip()

            # Parse the structured response
            soap_note = self._parse_soap_response(soap_text)

            return {
                "success": True,
                "soap_note": soap_note,
                "raw_dictation": dictation,
                "generated_at": datetime.utcnow().isoformat(),
                "method": "gemini_ai"
            }

        except Exception as e:
            logger.error(f"Gemini SOAP generation failed: {e}")

            # Try fallback key
            if self.gemini_fallback_key:
                try:
                    genai.configure(api_key=self.gemini_fallback_key)
                    fallback_model = genai.GenerativeModel('gemini-2.5-flash-latest')
                    response = fallback_model.generate_content(prompt)
                    soap_text = response.text.strip()
                    soap_note = self._parse_soap_response(soap_text)

                    return {
                        "success": True,
                        "soap_note": soap_note,
                        "raw_dictation": dictation,
                        "generated_at": datetime.utcnow().isoformat(),
                        "method": "gemini_fallback"
                    }
                except:
                    pass

            # Final fallback: template
            return self._generate_with_template(dictation, patient_context)

    def _build_soap_prompt(
        self,
        dictation: str,
        patient_context: Optional[Dict],
        previous_notes: Optional[str]
    ) -> str:
        """Build Gemini prompt for SOAP note generation"""
        prompt = """
You are a medical documentation assistant helping doctors create structured SOAP notes from their dictation.

SOAP Format:
- **Subjective (S)**: Patient's symptoms, complaints, history in their own words
- **Objective (O)**: Measurable findings - vitals, physical exam, lab results
- **Assessment (A)**: Medical diagnosis, differential diagnoses
- **Plan (P)**: Treatment plan, medications, follow-up, patient education

"""

        if patient_context:
            prompt += f"""
**Patient Context**:
- Name: {patient_context.get('name', 'Not provided')}
- Age: {patient_context.get('age', 'Not provided')}
- Chief Complaint: {patient_context.get('chief_complaint', 'Not stated')}
"""

        if previous_notes:
            prompt += f"""
**Previous Notes** (for context):
{previous_notes[:500]}  # First 500 chars
"""

        prompt += f"""
**Doctor's Dictation**:
{dictation}

**Instructions**:
1. Extract information from the dictation and organize it into SOAP format
2. Use medical terminology appropriately
3. Be concise but complete
4. If information for a section is missing, note "Not documented"
5. Infer appropriate section placement based on content

**Output Format**:
Provide the SOAP note in this exact format:

SUBJECTIVE:
[Content here]

OBJECTIVE:
[Content here]

ASSESSMENT:
[Content here]

PLAN:
[Content here]

Generate the SOAP note now:
"""

        return prompt

    def _parse_soap_response(self, soap_text: str) -> Dict:
        """Parse Gemini's SOAP note response into structured format"""
        sections = {
            "subjective": "",
            "objective": "",
            "assessment": "",
            "plan": ""
        }

        current_section = None
        lines = soap_text.split('\n')

        for line in lines:
            line = line.strip()

            # Check for section headers
            if line.upper().startswith('SUBJECTIVE'):
                current_section = 'subjective'
                continue
            elif line.upper().startswith('OBJECTIVE'):
                current_section = 'objective'
                continue
            elif line.upper().startswith('ASSESSMENT'):
                current_section = 'assessment'
                continue
            elif line.upper().startswith('PLAN'):
                current_section = 'plan'
                continue

            # Add content to current section
            if current_section and line:
                sections[current_section] += line + '\n'

        # Clean up sections
        for key in sections:
            sections[key] = sections[key].strip()

        return sections

    def _generate_with_template(
        self,
        dictation: str,
        patient_context: Optional[Dict]
    ) -> Dict:
        """Fallback: Basic template-based SOAP note generation"""
        # Simple keyword-based parsing as fallback
        lower_dictation = dictation.lower()

        # Try to identify sections based on keywords
        subjective_keywords = ['complains', 'reports', 'states', 'feels', 'symptoms', 'pain']
        objective_keywords = ['vital', 'temperature', 'blood pressure', 'examination', 'finding']
        assessment_keywords = ['diagnosis', 'diagnosed', 'impression', 'likely', 'suggests']
        plan_keywords = ['prescribe', 'treatment', 'follow up', 'recommend', 'advised']

        sections = {
            "subjective": "",
            "objective": "",
            "assessment": "",
            "plan": ""
        }

        # Simple heuristic: put entire dictation in appropriate section
        # based on which keywords appear most frequently
        keyword_counts = {
            'subjective': sum(1 for kw in subjective_keywords if kw in lower_dictation),
            'objective': sum(1 for kw in objective_keywords if kw in lower_dictation),
            'assessment': sum(1 for kw in assessment_keywords if kw in lower_dictation),
            'plan': sum(1 for kw in plan_keywords if kw in lower_dictation)
        }

        primary_section = max(keyword_counts, key=keyword_counts.get)
        sections[primary_section] = dictation

        return {
            "success": True,
            "soap_note": sections,
            "raw_dictation": dictation,
            "generated_at": datetime.utcnow().isoformat(),
            "method": "template_fallback",
            "warning": "Using basic template. For better results, configure Gemini API."
        }

    def enhance_soap_note(
        self,
        existing_soap: Dict,
        additional_dictation: str
    ) -> Dict:
        """
        Enhance existing SOAP note with additional dictation

        Args:
            existing_soap: Current SOAP note
            additional_dictation: Additional doctor dictation

        Returns:
            Updated SOAP note
        """
        if not self.gemini_enabled:
            # Simple append for fallback
            return {
                "success": True,
                "soap_note": existing_soap,
                "message": "Additional dictation recorded but not integrated (Gemini not configured)"
            }

        try:
            prompt = f"""
You are updating a medical SOAP note with additional information.

**Current SOAP Note**:
SUBJECTIVE: {existing_soap.get('subjective', '')}
OBJECTIVE: {existing_soap.get('objective', '')}
ASSESSMENT: {existing_soap.get('assessment', '')}
PLAN: {existing_soap.get('plan', '')}

**Additional Dictation**:
{additional_dictation}

**Instructions**:
1. Incorporate the additional dictation into the appropriate SOAP section(s)
2. Maintain consistency with existing content
3. Don't duplicate information
4. Preserve all existing information

Provide the updated SOAP note in the same format.
"""

            response = self.gemini_model.generate_content(prompt)
            soap_text = response.text.strip()
            updated_soap = self._parse_soap_response(soap_text)

            return {
                "success": True,
                "soap_note": updated_soap,
                "method": "gemini_enhancement"
            }

        except Exception as e:
            logger.error(f"SOAP enhancement failed: {e}")
            return {
                "success": False,
                "soap_note": existing_soap,
                "error": str(e)
            }

    def generate_summary(self, soap_note: Dict) -> str:
        """
        Generate a concise summary of the SOAP note

        Args:
            soap_note: Complete SOAP note

        Returns:
            Brief summary string
        """
        if not self.gemini_enabled:
            # Simple concatenation
            return f"Patient presents with {soap_note.get('subjective', 'documented symptoms')}. " \
                   f"Diagnosed with {soap_note.get('assessment', 'condition')}. " \
                   f"Plan: {soap_note.get('plan', 'treatment prescribed')}."

        try:
            prompt = f"""
Provide a 2-3 sentence summary of this SOAP note for quick reference:

SUBJECTIVE: {soap_note.get('subjective', '')}
OBJECTIVE: {soap_note.get('objective', '')}
ASSESSMENT: {soap_note.get('assessment', '')}
PLAN: {soap_note.get('plan', '')}

Summary:
"""

            response = self.gemini_model.generate_content(prompt)
            return response.text.strip()

        except:
            return "SOAP note generated from doctor's dictation."

    def validate_soap_note(self, soap_note: Dict) -> Dict:
        """
        Validate completeness of SOAP note

        Returns:
            Dict with validation results and suggestions
        """
        issues = []
        warnings = []

        # Check for empty sections
        for section in ['subjective', 'objective', 'assessment', 'plan']:
            content = soap_note.get(section, '').strip()

            if not content or content.lower() == 'not documented':
                issues.append(f"{section.capitalize()} section is empty")
            elif len(content) < 20:
                warnings.append(f"{section.capitalize()} section may be incomplete (very short)")

        # Check for critical missing elements
        objective = soap_note.get('objective', '').lower()
        if 'vital' not in objective and 'bp' not in objective and 'temperature' not in objective:
            warnings.append("No vital signs documented in Objective section")

        plan = soap_note.get('plan', '').lower()
        if not plan or len(plan) < 10:
            issues.append("Treatment plan is missing or incomplete")

        return {
            "is_valid": len(issues) == 0,
            "is_complete": len(issues) == 0 and len(warnings) == 0,
            "issues": issues,
            "warnings": warnings,
            "completeness_score": max(0, 100 - (len(issues) * 25) - (len(warnings) * 10))
        }
