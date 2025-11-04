"""
AI Analytics Service using Google Gemini 2.5 Flash
Provides intelligent analysis of hospitalization trends and generates alerts
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIAnalyticsService:
    """AI-powered analytics service for healthcare data analysis"""
    
    def __init__(self):
        self.model_name = "gemini-2.0-flash-exp"  # Latest Gemini model
        try:
            self.model = genai.GenerativeModel(self.model_name)
        except Exception as e:
            print(f"Warning: Could not initialize Gemini model: {e}")
            self.model = None
    
    async def analyze_hospitalization_trends(
        self,
        hospitalization_data: List[Dict[str, Any]],
        historical_data: Optional[List[Dict[str, Any]]] = None,
        hospital_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze hospitalization trends using Gemini AI
        
        Args:
            hospitalization_data: Current period hospitalization reasons data
            historical_data: Previous period data for comparison
            hospital_context: Hospital metadata (location, size, etc.)
        
        Returns:
            AI-generated insights with alerts and recommendations
        """
        
        if not self.model:
            return self._generate_fallback_analysis(hospitalization_data)
        
        # Prepare prompt for Gemini
        prompt = self._build_analysis_prompt(
            hospitalization_data,
            historical_data,
            hospital_context
        )
        
        try:
            # Generate analysis using Gemini
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,  # Lower temperature for more factual analysis
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 2048,
                }
            )
            
            # Parse AI response
            analysis = self._parse_ai_response(response.text)
            
            # Add metadata
            analysis["ai_model"] = self.model_name
            analysis["generated_at"] = datetime.utcnow().isoformat()
            analysis["confidence_score"] = self._calculate_confidence(analysis)
            
            return analysis
            
        except Exception as e:
            print(f"Error in AI analysis: {e}")
            return self._generate_fallback_analysis(hospitalization_data)
    
    def _build_analysis_prompt(
        self,
        current_data: List[Dict[str, Any]],
        historical_data: Optional[List[Dict[str, Any]]],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build comprehensive prompt for Gemini AI"""
        
        prompt = """You are an expert public health analyst AI system analyzing hospital admission data to detect potential pandemics, disease outbreaks, and health crises.

**YOUR TASK:**
Analyze the hospitalization data and provide critical alerts for hospital administrators and local government health authorities.

**CURRENT HOSPITALIZATION DATA:**
"""
        
        # Add current data
        for item in current_data:
            prompt += f"\n- {item['reason']}: {item['count']} cases (Severity: {item['severity']}, Trend: {item['trend']})"
        
        if historical_data:
            prompt += "\n\n**HISTORICAL COMPARISON (Previous Period):**\n"
            for item in historical_data:
                prompt += f"\n- {item['reason']}: {item['count']} cases"
        
        if context:
            prompt += f"\n\n**HOSPITAL CONTEXT:**"
            prompt += f"\n- Hospital: {context.get('hospital_name', 'Unknown')}"
            prompt += f"\n- Location: {context.get('location', 'Unknown')}"
            prompt += f"\n- Bed Capacity: {context.get('bed_capacity', 'Unknown')}"
            prompt += f"\n- Region: {context.get('region', 'Unknown')}"
        
        prompt += """

**ANALYSIS REQUIREMENTS:**

1. **CRITICAL ALERTS** - Identify immediate threats requiring government intervention:
   - Potential pandemic indicators (respiratory infections, infectious diseases)
   - Sudden spikes in specific conditions (>20% increase)
   - Unusual patterns that deviate from normal
   - Multiple related conditions increasing simultaneously

2. **OUTBREAK DETECTION** - Look for signs of disease outbreaks:
   - Clustering of infectious diseases
   - Seasonal patterns (flu, respiratory)
   - Geographic spread indicators
   - Vulnerable population impacts

3. **RESOURCE STRAIN ALERTS** - Identify capacity issues:
   - Overall admission volume increases
   - Multiple high-severity conditions
   - Potential bed shortage indicators

4. **PUBLIC HEALTH RECOMMENDATIONS** - Suggest actions:
   - Immediate interventions needed
   - Preventive measures
   - Resource allocation priorities
   - Government coordination requirements

5. **TREND PREDICTIONS** - Forecast likely scenarios:
   - Expected trajectory (next 7-14 days)
   - Risk level assessment
   - Early warning indicators

**OUTPUT FORMAT (Return as JSON-parseable text):**

{
  "alert_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "pandemic_risk": 0-100 (percentage),
  "outbreak_detected": true/false,
  "critical_findings": [
    "Finding 1 with specific numbers and concern",
    "Finding 2...",
    ...
  ],
  "alerts": [
    {
      "type": "PANDEMIC_RISK" | "SUDDEN_SPIKE" | "RESOURCE_STRAIN" | "OUTBREAK",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM",
      "reason": "Specific condition name",
      "description": "Detailed description of the alert",
      "evidence": "Data supporting this alert (numbers, trends)",
      "action_required": "What admins/govt should do immediately"
    }
  ],
  "recommendations": {
    "immediate_actions": ["Action 1", "Action 2", ...],
    "govt_coordination": ["Coordination step 1", ...],
    "preventive_measures": ["Prevention step 1", ...],
    "resource_allocation": ["Resource priority 1", ...]
  },
  "trend_forecast": {
    "next_7_days": "Forecast description",
    "next_14_days": "Forecast description",
    "risk_trajectory": "INCREASING" | "STABLE" | "DECREASING"
  },
  "summary": "Overall assessment in 2-3 sentences for quick executive review"
}

**IMPORTANT:**
- Be specific with numbers and percentages
- Flag ANYTHING that could indicate a pandemic (respiratory, infectious diseases)
- Consider sudden spikes (>15% increase) as HIGH priority
- Compare to typical/expected values when possible
- Provide actionable recommendations, not vague advice

Analyze the data now and return ONLY the JSON object (no markdown formatting, no code blocks):"""
        
        return prompt
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """Parse AI response and extract structured data"""
        
        try:
            # Clean response (remove markdown code blocks if present)
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Parse JSON
            analysis = json.loads(cleaned)
            
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"Response: {response_text[:500]}")
            
            # Return structured fallback
            return {
                "alert_level": "MEDIUM",
                "pandemic_risk": 30,
                "outbreak_detected": False,
                "critical_findings": [
                    "AI analysis completed but response format needs adjustment",
                    "Manual review of hospitalization data recommended"
                ],
                "alerts": [],
                "recommendations": {
                    "immediate_actions": ["Review raw data manually"],
                    "govt_coordination": [],
                    "preventive_measures": [],
                    "resource_allocation": []
                },
                "trend_forecast": {
                    "next_7_days": "Unable to forecast",
                    "next_14_days": "Unable to forecast",
                    "risk_trajectory": "STABLE"
                },
                "summary": "AI analysis completed. Please review detailed data for insights.",
                "raw_response": response_text[:1000]  # Include raw response for debugging
            }
    
    def _calculate_confidence(self, analysis: Dict[str, Any]) -> float:
        """Calculate confidence score for the analysis"""
        
        confidence = 70.0  # Base confidence
        
        # Increase confidence if detailed alerts are present
        if analysis.get("alerts") and len(analysis["alerts"]) > 0:
            confidence += 10.0
        
        # Increase confidence if critical findings are present
        if analysis.get("critical_findings") and len(analysis["critical_findings"]) > 2:
            confidence += 10.0
        
        # Increase confidence if recommendations are comprehensive
        recs = analysis.get("recommendations", {})
        if len(recs.get("immediate_actions", [])) > 2:
            confidence += 5.0
        
        # Cap at 95%
        return min(confidence, 95.0)
    
    def _generate_fallback_analysis(
        self,
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate rule-based analysis when AI is unavailable"""
        
        total_cases = sum(item["count"] for item in data)
        critical_count = sum(1 for item in data if item["severity"] == "critical")
        high_increase = [
            item for item in data 
            if item.get("trend", "0%").replace("%", "").replace("+", "").replace("-", "").isdigit()
            and float(item.get("trend", "0%").replace("%", "").replace("+", "").replace("-", "")) > 15
        ]
        
        # Detect respiratory/infectious patterns
        respiratory_keywords = ["respiratory", "pneumonia", "infectious", "covid", "flu"]
        respiratory_cases = [
            item for item in data
            if any(keyword in item["reason"].lower() for keyword in respiratory_keywords)
        ]
        
        alerts = []
        alert_level = "LOW"
        pandemic_risk = 0
        
        # Check for pandemic indicators
        if respiratory_cases:
            total_respiratory = sum(item["count"] for item in respiratory_cases)
            if total_respiratory > 200:
                alert_level = "CRITICAL"
                pandemic_risk = 75
                alerts.append({
                    "type": "PANDEMIC_RISK",
                    "severity": "CRITICAL",
                    "reason": "Respiratory Infections Cluster",
                    "description": f"High volume of respiratory-related hospitalizations detected: {total_respiratory} cases",
                    "evidence": f"Total respiratory cases: {total_respiratory}",
                    "action_required": "Immediate contact with local health department. Activate pandemic response protocols."
                })
        
        # Check for sudden spikes
        for item in high_increase:
            alerts.append({
                "type": "SUDDEN_SPIKE",
                "severity": "HIGH",
                "reason": item["reason"],
                "description": f"Rapid increase detected in {item['reason']}",
                "evidence": f"Increase: {item['trend']}, Current count: {item['count']}",
                "action_required": "Investigate cause of spike. Prepare additional resources."
            })
            if alert_level == "LOW":
                alert_level = "HIGH"
        
        # Check for critical severity
        if critical_count > 2:
            if alert_level != "CRITICAL":
                alert_level = "HIGH"
            pandemic_risk = max(pandemic_risk, 45)
        
        return {
            "alert_level": alert_level,
            "pandemic_risk": pandemic_risk,
            "outbreak_detected": len(respiratory_cases) > 0 and total_respiratory > 150,
            "critical_findings": [
                f"Total hospitalizations: {total_cases} cases",
                f"Critical severity conditions: {critical_count}",
                f"Conditions with rapid increase (>15%): {len(high_increase)}",
                f"Respiratory/infectious cases: {sum(item['count'] for item in respiratory_cases)}"
            ],
            "alerts": alerts,
            "recommendations": {
                "immediate_actions": [
                    "Review current infection control protocols",
                    "Monitor bed capacity closely",
                    "Increase staff readiness"
                ] if alert_level in ["HIGH", "CRITICAL"] else ["Continue regular monitoring"],
                "govt_coordination": [
                    "Report trends to local health department",
                    "Request epidemic response support"
                ] if pandemic_risk > 50 else [],
                "preventive_measures": [
                    "Enhanced hygiene protocols",
                    "Public health advisory",
                    "Vaccination campaign (if applicable)"
                ] if len(respiratory_cases) > 0 else [],
                "resource_allocation": [
                    "Increase ICU capacity preparedness",
                    "Stock essential medications",
                    "Prepare isolation facilities"
                ] if alert_level == "CRITICAL" else []
            },
            "trend_forecast": {
                "next_7_days": "Likely increase if no intervention" if alert_level in ["HIGH", "CRITICAL"] else "Stable pattern expected",
                "next_14_days": "Potential outbreak scenario" if pandemic_risk > 60 else "Normal operations likely",
                "risk_trajectory": "INCREASING" if len(high_increase) > 3 else "STABLE"
            },
            "summary": f"Alert Level: {alert_level}. {len(alerts)} active alerts detected. " + 
                      ("PANDEMIC RISK IDENTIFIED - Immediate action required." if pandemic_risk > 60 else "Continue monitoring."),
            "ai_model": "rule-based-fallback",
            "generated_at": datetime.utcnow().isoformat(),
            "confidence_score": 60.0
        }


# Singleton instance
ai_analytics_service = AIAnalyticsService()
