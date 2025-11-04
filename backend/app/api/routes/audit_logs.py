"""Audit Log API routes"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.audit_service import AuditService
from app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogFilters,
    PaginatedAuditLogs,
)
from app.models.user import User

router = APIRouter()


def get_audit_service(db: Session = Depends(get_db)) -> AuditService:
    """Get audit service instance"""
    return AuditService(db)


@router.get("", response_model=PaginatedAuditLogs)
def get_audit_logs(
    user_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("super_admin", "regional_admin")),
    audit_service: AuditService = Depends(get_audit_service),
):
    """Get paginated audit logs with filters"""
    filters = AuditLogFilters(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_date,
        end_date=end_date,
    )
    return audit_service.get_audit_logs(filters=filters, page=page, page_size=page_size)


@router.post("", response_model=AuditLogResponse)
def create_audit_log(
    audit_data: AuditLogCreate,
    audit_service: AuditService = Depends(get_audit_service),
):
    """Create a new audit log entry (internal use)"""
    return audit_service.create_audit_log(audit_data)
