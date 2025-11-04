"""
Push notification subscription management API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from uuid import UUID
from datetime import datetime
import os

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.push_subscription import PushSubscription
from pydantic import BaseModel

# Note: main.py includes this router with prefix=f"{settings.API_V1_STR}/push"
# Avoid duplicating '/push' here to prevent paths like '/api/v1/push/push/...'
router = APIRouter()


class PushSubscriptionRequest(BaseModel):
    """Request body for push subscription"""
    subscription: Dict[str, Any]  # Full subscription object from browser
    device_info: str = None


class VapidPublicKeyResponse(BaseModel):
    """Response containing VAPID public key"""
    public_key: str


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
async def get_vapid_public_key():
    """
    Get VAPID public key for push subscription
    Frontend needs this to subscribe to push notifications
    """
    public_key = os.getenv("VAPID_PUBLIC_KEY")

    if not public_key:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured. VAPID keys missing."
        )

    return {"public_key": public_key}


@router.post("/subscribe")
async def subscribe_to_push(
    request: PushSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Subscribe user to push notifications
    Called when user grants notification permission in browser
    """
    try:
        endpoint = request.subscription.get("endpoint")

        if not endpoint:
            raise HTTPException(status_code=400, detail="Invalid subscription data")

        # Check if subscription already exists
        existing = db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint
        ).first()

        if existing:
            # Update existing subscription
            existing.subscription_data = request.subscription
            existing.device_info = request.device_info
            existing.is_active = True
            existing.updated_at = datetime.utcnow()
            db.commit()

            return {
                "success": True,
                "message": "Push subscription updated",
                "subscription_id": str(existing.id)
            }

        # Create new subscription
        subscription = PushSubscription(
            user_id=current_user.id,
            subscription_data=request.subscription,
            endpoint=endpoint,
            device_info=request.device_info,
            is_active=True,
        )

        db.add(subscription)
        db.commit()
        db.refresh(subscription)

        return {
            "success": True,
            "message": "Successfully subscribed to push notifications",
            "subscription_id": str(subscription.id)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@router.post("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unsubscribe from push notifications
    Called when user revokes notification permission
    """
    subscription = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == endpoint
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscription.is_active = False
    db.commit()

    return {
        "success": True,
        "message": "Unsubscribed from push notifications"
    }


@router.get("/subscriptions")
async def get_my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all push subscriptions for current user"""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.is_active == True
    ).all()

    return {
        "subscriptions": [
            {
                "id": str(sub.id),
                "device_info": sub.device_info,
                "created_at": sub.created_at.isoformat(),
                "last_used_at": sub.last_used_at.isoformat() if sub.last_used_at else None
            }
            for sub in subscriptions
        ]
    }


@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specific push subscription"""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.id == subscription_id,
        PushSubscription.user_id == current_user.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(subscription)
    db.commit()

    return {
        "success": True,
        "message": "Subscription deleted"
    }
