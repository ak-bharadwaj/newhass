"""Audit service for audit log management"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogFilters,
    PaginatedAuditLogs,
)


class AuditService:
    """Service for audit log operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_audit_log(self, audit_data: AuditLogCreate) -> AuditLogResponse:
        """Create a new audit log entry"""
        audit_log = AuditLog(
            user_id=audit_data.user_id,
            action=audit_data.action,
            resource_type=audit_data.resource_type,
            resource_id=audit_data.resource_id,
            before_state=audit_data.before_state,
            after_state=audit_data.after_state,
            ip_address=audit_data.ip_address,
            user_agent=audit_data.user_agent,
            notes=audit_data.notes,
        )

        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)

        # Get user info if available
        user_email = None
        user_name = None
        if audit_log.user:
            user_email = audit_log.user.email
            user_name = f"{audit_log.user.first_name} {audit_log.user.last_name}"

        return AuditLogResponse(
            id=audit_log.id,
            user_id=audit_log.user_id,
            user_email=user_email,
            user_name=user_name,
            action=audit_log.action,
            resource_type=audit_log.resource_type,
            resource_id=audit_log.resource_id,
            before_state=audit_log.before_state,
            after_state=audit_log.after_state,
            ip_address=str(audit_log.ip_address) if audit_log.ip_address else None,
            user_agent=audit_log.user_agent,
            notes=audit_log.notes,
            created_at=audit_log.created_at,
        )

    def get_audit_logs(
        self, filters: Optional[AuditLogFilters] = None, page: int = 1, page_size: int = 50
    ) -> PaginatedAuditLogs:
        """Get paginated audit logs with filters"""
        query = self.db.query(AuditLog)

        # Apply filters
        if filters:
            if filters.user_id:
                query = query.filter(AuditLog.user_id == filters.user_id)
            if filters.action:
                query = query.filter(AuditLog.action == filters.action)
            if filters.resource_type:
                query = query.filter(AuditLog.resource_type == filters.resource_type)
            if filters.resource_id:
                query = query.filter(AuditLog.resource_id == filters.resource_id)
            if filters.start_date:
                query = query.filter(AuditLog.created_at >= filters.start_date)
            if filters.end_date:
                query = query.filter(AuditLog.created_at <= filters.end_date)

        # Order by most recent first
        query = query.order_by(AuditLog.created_at.desc())

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        audit_logs = query.offset(offset).limit(page_size).all()

        # Convert to response schema
        log_responses = []
        for log in audit_logs:
            user_email = None
            user_name = None
            if log.user:
                user_email = log.user.email
                user_name = f"{log.user.first_name} {log.user.last_name}"

            log_responses.append(
                AuditLogResponse(
                    id=log.id,
                    user_id=log.user_id,
                    user_email=user_email,
                    user_name=user_name,
                    action=log.action,
                    resource_type=log.resource_type,
                    resource_id=log.resource_id,
                    before_state=log.before_state,
                    after_state=log.after_state,
                    ip_address=str(log.ip_address) if log.ip_address else None,
                    user_agent=log.user_agent,
                    notes=log.notes,
                    created_at=log.created_at,
                )
            )

        return PaginatedAuditLogs(logs=log_responses, total=total, page=page, page_size=page_size)
