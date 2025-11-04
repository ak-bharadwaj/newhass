"""
Abstract AI adapter interface for pluggable LLM providers
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class AIAdapter(ABC):
    """Base class for AI adapters"""

    @abstractmethod
    async def generate_risk_score(
        self,
        patient_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate patient risk score based on medical data

        Returns:
            {
                "risk_score": int (0-100),
                "confidence": float (0.0-1.0),
                "factors": list[str],
                "recommendations": list[str]
            }
        """
        pass

    @abstractmethod
    async def generate_discharge_summary(
        self,
        visit_data: Dict[str, Any],
        vitals_data: list[Dict[str, Any]],
        prescriptions: list[Dict[str, Any]],
        lab_tests: list[Dict[str, Any]],
        nurse_logs: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate structured discharge summary

        Returns:
            {
                "summary": str,
                "diagnoses": list[str],
                "procedures": list[str],
                "medications": list[str],
                "follow_up": str
            }
        """
        pass

    @abstractmethod
    async def generate_treatment_plan(
        self,
        patient_data: Dict[str, Any],
        symptoms: str,
        vitals_data: list[Dict[str, Any]],
        lab_results: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate treatment plan suggestions

        Returns:
            {
                "primary_diagnosis": str,
                "differential_diagnoses": list[str],
                "recommended_tests": list[str],
                "treatment_options": list[Dict[str, Any]],
                "precautions": list[str]
            }
        """
        pass

    @abstractmethod
    async def detect_vitals_anomaly(
        self,
        vitals_data: list[Dict[str, Any]],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect anomalies in vitals data

        Returns:
            {
                "is_anomalous": bool,
                "severity": str (low|medium|high|critical),
                "anomalies": list[str],
                "recommended_actions": list[str]
            }
        """
        pass
