"""
AI Analytics API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_active_user as get_current_user
from app.models.user import User
from app.services.ai_analytics_service import ai_analytics_service
from pydantic import BaseModel

router = APIRouter()


class HospitalizationReasonData(BaseModel):
    """Model for hospitalization reason data"""
    reason: str
    count: int
    severity: str
    trend: str
    value: int


class AIAnalysisRequest(BaseModel):
    """Request model for AI analysis"""
    current_data: List[HospitalizationReasonData]
    historical_data: Optional[List[HospitalizationReasonData]] = None
    hospital_context: Optional[Dict[str, Any]] = None


class AIAnalysisResponse(BaseModel):
    """Response model for AI analysis"""
    alert_level: str
    pandemic_risk: float
    outbreak_detected: bool
    critical_findings: List[str]
    alerts: List[Dict[str, Any]]
    recommendations: Dict[str, List[str]]
    trend_forecast: Dict[str, str]
    summary: str
    ai_model: str
    generated_at: str
    confidence_score: float


@router.post("/ai-analysis", response_model=AIAnalysisResponse)
async def analyze_hospitalization_data(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI-powered analysis of hospitalization trends using Gemini 2.5 Flash
    
    **Features:**
    - Pandemic detection
    - Outbreak identification
    - Sudden spike alerts
    - Resource strain warnings
    - Actionable recommendations for admins and government
    
    **Requires:** Admin, Hospital Admin, Regional Admin, or Super Admin role
    """
    
    # Check permissions
    allowed_roles = ["hospital_admin", "regional_admin", "super_admin"]
    if current_user.role.name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access AI analytics"
        )
    
    try:
        # Convert Pydantic models to dicts
        current_data = [item.dict() for item in request.current_data]
        historical_data = [item.dict() for item in request.historical_data] if request.historical_data else None
        
        # Add user's hospital context if not provided
        if not request.hospital_context and current_user.hospital_id:
            from app.models.hospital import Hospital
            hospital = db.query(Hospital).filter(Hospital.id == current_user.hospital_id).first()
            if hospital:
                request.hospital_context = {
                    "hospital_name": hospital.name,
                    "location": hospital.address or "Unknown",
                    "bed_capacity": hospital.bed_capacity,
                    "region": hospital.region_id
                }
        
        # Perform AI analysis
        analysis = await ai_analytics_service.analyze_hospitalization_trends(
            hospitalization_data=current_data,
            historical_data=historical_data,
            hospital_context=request.hospital_context
        )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )


@router.get("/ai-analysis/quick")
async def quick_ai_analysis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick AI analysis using mock data (for demo/testing)
    
    **Use Case:** Test AI alerts without real data
    """
    
    # Check permissions
    allowed_roles = ["hospital_admin", "regional_admin", "super_admin"]
    if current_user.role.name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access AI analytics"
        )
    
    # Generate mock data for demo
    mock_data = [
        {"reason": "Respiratory Infections", "count": 185, "severity": "high", "trend": "+12%", "value": 185},
        {"reason": "Cardiovascular Disease", "count": 156, "severity": "critical", "trend": "+8%", "value": 156},
        {"reason": "Accidents & Trauma", "count": 142, "severity": "high", "trend": "-3%", "value": 142},
        {"reason": "Diabetes Complications", "count": 128, "severity": "medium", "trend": "+15%", "value": 128},
        {"reason": "Infectious Diseases", "count": 98, "severity": "high", "trend": "+25%", "value": 98},
        {"reason": "Pneumonia", "count": 43, "severity": "high", "trend": "+20%", "value": 43},
    ]
    
    mock_historical = [
        {"reason": "Respiratory Infections", "count": 165, "severity": "high", "trend": "+5%", "value": 165},
        {"reason": "Cardiovascular Disease", "count": 145, "severity": "critical", "trend": "+3%", "value": 145},
        {"reason": "Infectious Diseases", "count": 78, "severity": "medium", "trend": "+8%", "value": 78},
    ]
    
    try:
        analysis = await ai_analytics_service.analyze_hospitalization_trends(
            hospitalization_data=mock_data,
            historical_data=mock_historical,
            hospital_context={
                "hospital_name": getattr(current_user, "hospital", None).name if getattr(current_user, "hospital", None) else "Demo Hospital",
                "location": "Demo Location",
                "bed_capacity": 200,
                "region": "Demo Region"
            }
        )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {str(e)}"
        )
