"""Voice-to-Text Service for Clinical Data Entry"""
import re
from typing import Dict, Optional
from fastapi import UploadFile
import openai
from app.core.config import settings


class VoiceToTextService:
    """
    Service for converting speech to text for clinical data entry

    Supports:
    - Vitals signs dictation
    - Clinical notes
    - Patient information
    """

    def __init__(self):
        self.openai_configured = settings.OPENAI_API_KEY is not None
        if self.openai_configured:
            openai.api_key = settings.OPENAI_API_KEY

    async def transcribe_audio(
        self,
        audio_file: UploadFile,
        context: str = "medical"
    ) -> Dict:
        """
        Transcribe audio file to text

        Args:
            audio_file: Audio file (wav, mp3, m4a, webm)
            context: Context for transcription (medical, vitals, notes)

        Returns:
            Dict with transcribed text and confidence
        """
        if not self.openai_configured:
            return {
                "success": False,
                "text": "",
                "error": "OpenAI API key not configured. Voice-to-text unavailable."
            }

        try:
            # Read audio file
            audio_data = await audio_file.read()

            # Use OpenAI Whisper API
            response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_data,
                language="en",
                prompt=self._get_context_prompt(context)
            )

            transcribed_text = response.get("text", "")

            return {
                "success": True,
                "text": transcribed_text,
                "confidence": "high",  # Whisper doesn't provide confidence scores
                "language": "en"
            }

        except Exception as e:
            return {
                "success": False,
                "text": "",
                "error": f"Transcription failed: {str(e)}"
            }

    def parse_vitals_from_text(self, text: str) -> Dict:
        """
        Parse vital signs from transcribed text

        Args:
            text: Transcribed text containing vitals

        Returns:
            Dict with extracted vital signs
        """
        vitals = {}

        # Temperature (Celsius or Fahrenheit)
        temp_match = re.search(r'temperature\s+(?:is\s+)?(\d+\.?\d*)\s*(celsius|c|fahrenheit|f)?', text, re.IGNORECASE)
        if temp_match:
            temp_value = float(temp_match.group(1))
            temp_unit = temp_match.group(2) if temp_match.group(2) else "celsius"

            # Convert Fahrenheit to Celsius if needed
            if temp_unit.lower() in ['fahrenheit', 'f']:
                temp_value = (temp_value - 32) * 5/9

            vitals['temperature'] = round(temp_value, 1)

        # Heart Rate (bpm)
        hr_match = re.search(r'(?:heart\s+rate|pulse)\s+(?:is\s+)?(\d+)', text, re.IGNORECASE)
        if hr_match:
            vitals['heart_rate'] = int(hr_match.group(1))

        # Blood Pressure (systolic/diastolic)
        bp_match = re.search(r'(?:blood\s+pressure|bp)\s+(?:is\s+)?(\d+)\s*(?:over|\/)\s*(\d+)', text, re.IGNORECASE)
        if bp_match:
            vitals['blood_pressure_systolic'] = int(bp_match.group(1))
            vitals['blood_pressure_diastolic'] = int(bp_match.group(2))

        # Respiratory Rate
        rr_match = re.search(r'(?:respiratory\s+rate|respiration|breathing)\s+(?:is\s+)?(\d+)', text, re.IGNORECASE)
        if rr_match:
            vitals['respiratory_rate'] = int(rr_match.group(1))

        # SpO2 (Oxygen Saturation)
        spo2_match = re.search(r'(?:spo2|oxygen\s+saturation|o2\s+sat)\s+(?:is\s+)?(\d+)', text, re.IGNORECASE)
        if spo2_match:
            vitals['spo2'] = int(spo2_match.group(1))

        # Pain Score (0-10)
        pain_match = re.search(r'pain\s+(?:score|level)\s+(?:is\s+)?(\d+)', text, re.IGNORECASE)
        if pain_match:
            vitals['pain_score'] = int(pain_match.group(1))

        return {
            "vitals": vitals,
            "original_text": text,
            "parsed_count": len(vitals)
        }

    def _get_context_prompt(self, context: str) -> str:
        """
        Get context-specific prompt for better transcription

        Args:
            context: Context type (medical, vitals, notes)

        Returns:
            Context prompt string
        """
        prompts = {
            "medical": "Medical terminology including vital signs, symptoms, diagnoses, and treatments.",
            "vitals": "Vital signs including temperature, heart rate, blood pressure, respiratory rate, and SpO2.",
            "notes": "Clinical notes and patient observations."
        }

        return prompts.get(context, prompts["medical"])

    def format_vitals_response(self, vitals_data: Dict) -> str:
        """
        Format parsed vitals into human-readable text

        Args:
            vitals_data: Dict with parsed vitals

        Returns:
            Formatted string
        """
        vitals = vitals_data.get("vitals", {})

        if not vitals:
            return "No vitals detected in the transcription."

        lines = ["Extracted Vitals:"]

        if "temperature" in vitals:
            lines.append(f"  • Temperature: {vitals['temperature']}°C")

        if "heart_rate" in vitals:
            lines.append(f"  • Heart Rate: {vitals['heart_rate']} bpm")

        if "blood_pressure_systolic" in vitals and "blood_pressure_diastolic" in vitals:
            lines.append(f"  • Blood Pressure: {vitals['blood_pressure_systolic']}/{vitals['blood_pressure_diastolic']} mmHg")

        if "respiratory_rate" in vitals:
            lines.append(f"  • Respiratory Rate: {vitals['respiratory_rate']} breaths/min")

        if "spo2" in vitals:
            lines.append(f"  • SpO2: {vitals['spo2']}%")

        if "pain_score" in vitals:
            lines.append(f"  • Pain Score: {vitals['pain_score']}/10")

        return "\n".join(lines)
