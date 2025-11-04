"""Pydantic schemas for Audit Log resources"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class AuditLogBase(BaseModel):
    """Base audit log schema"""
    action: str
    resource_type: str
    resource_id: UUID
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    notes: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    """Schema for creating an audit log"""
    user_id: Optional[UUID] = None


class AuditLogResponse(AuditLogBase):
    """Schema for audit log response"""
    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogFilters(BaseModel):
    """Filters for audit log query"""
    user_id: Optional[UUID] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class PaginatedAuditLogs(BaseModel):
    """Paginated audit logs response"""
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
