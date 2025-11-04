"""
Notification API endpoints for in-app notifications
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkReadRequest,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Get current user's in-app notifications
    Returns notifications ordered by created_at descending (newest first)
    """
    query = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.channel == "in_app"
    )

    if unread_only:
        query = query.filter(Notification.status == "pending")

    total = query.count()

    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "notifications": notifications,
        "total": total,
        "unread_count": db.query(Notification).filter(
            Notification.recipient_user_id == current_user.id,
            Notification.channel == "in_app",
            Notification.status == "pending"
        ).count()
    }


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.status = "delivered"
    notification.delivered_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all in-app notifications as read"""
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == current_user.id,
            Notification.channel == "in_app",
            Notification.status == "pending"
        )
        .update({
            "status": "delivered",
            "delivered_at": datetime.utcnow()
        })
    )
    db.commit()

    return {"success": True, "message": f"Marked {updated_count} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"success": True, "message": "Notification deleted"}


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread in-app notifications"""
    count = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.channel == "in_app",
        Notification.status == "pending"
    ).count()

    return {"unread_count": count}
