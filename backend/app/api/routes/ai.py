"""
AI feature API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.permissions import require_permission
from app.services.ai_service import AIService
from app.ai.models import (
    RiskScoreResponse,
    DischargeSummaryResponse,
    TreatmentPlanRequest,
    TreatmentPlanResponse,
    VitalsAnomalyResponse,
    AIDraftResponse,
    AIDraftUpdate
)
from app.models.user import User

router = APIRouter()


@router.post("/risk-score/{patient_id}", response_model=RiskScoreResponse)
async def generate_risk_score(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_view_emr"))
):
    """
    Generate AI risk score for patient
    Requires: can_view_emr permission (doctor, nurse)
    """
    try:
        service = AIService(db)
        result = await service.generate_risk_score(patient_id, create_draft=True)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/summarize-discharge/{visit_id}", response_model=DischargeSummaryResponse)
async def generate_discharge_summary(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_edit_emr"))
):
    """
    Generate AI discharge summary for visit
    Requires: can_edit_emr permission (doctor only)
    """
    try:
        service = AIService(db)
        result = await service.generate_discharge_summary(visit_id, create_draft=True)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/treatment-plan", response_model=TreatmentPlanResponse)
async def generate_treatment_plan(
    request: TreatmentPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_prescribe"))
):
    """
    Generate AI treatment plan suggestions
    Requires: can_prescribe permission (doctor only)
    """
    try:
        service = AIService(db)
        result = await service.generate_treatment_plan(
            request.patient_id,
            request.symptoms,
            create_draft=True
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/vitals-anomaly/{patient_id}", response_model=VitalsAnomalyResponse)
async def detect_vitals_anomaly(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_view_emr"))
):
    """
    Detect anomalies in patient vitals
    Requires: can_view_emr permission (doctor, nurse)
    """
    try:
        service = AIService(db)
        result = await service.detect_vitals_anomaly(patient_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/drafts", response_model=List[AIDraftResponse])
def get_ai_drafts(
    draft_type: Optional[str] = None,
    patient_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_view_emr"))
):
    """
    Get pending AI drafts for review
    Requires: can_view_emr permission
    """
    try:
        service = AIService(db)
        drafts = service.get_pending_drafts(draft_type=draft_type, patient_id=patient_id)
        return drafts
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/approve/{draft_id}", response_model=AIDraftResponse)
def approve_draft(
    draft_id: UUID,
    update: AIDraftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("can_edit_emr"))
):
    """
    Approve AI draft (doctor only)
    Requires: can_edit_emr permission
    """
    try:
        service = AIService(db)

        if update.status == "approved":
            draft = service.approve_draft(
                draft_id,
                current_user.id,
                update.approval_notes
            )
        elif update.status == "rejected":
            draft = service.reject_draft(
                draft_id,
                current_user.id,
                update.approval_notes or "No reason provided"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be 'approved' or 'rejected'"
            )

        return draft
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
