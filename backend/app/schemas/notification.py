"""
Pydantic schemas for notifications
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class NotificationResponse(BaseModel):
    """Response schema for a single notification"""
    id: UUID
    recipient_user_id: UUID
    notification_type: str
    channel: str
    recipient_address: str
    subject: Optional[str]
    message: str
    status: str
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    failed_at: Optional[datetime]
    failure_reason: Optional[str]
    retry_count: int
    max_retries: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response schema for list of notifications"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class NotificationMarkReadRequest(BaseModel):
    """Request schema for marking notifications as read"""
    notification_ids: List[UUID]


class NotificationCreate(BaseModel):
    """Schema for creating a notification"""
    recipient_user_id: UUID
    notification_type: str
    channel: str
    recipient_address: str
    subject: Optional[str] = None
    message: str
