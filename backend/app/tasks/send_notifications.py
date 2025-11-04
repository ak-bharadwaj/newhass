"""
Celery task for sending notifications
Processes pending notifications and sends them via appropriate channels
"""
from celery import shared_task
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.notifications.email_provider import EmailProvider
from app.notifications.push_provider import PushProvider
from app.notifications.in_app_provider import InAppProvider
from datetime import datetime
import logging
import asyncio

logger = logging.getLogger(__name__)


def get_provider(channel: str):
    """Get notification provider based on channel"""
    if channel == "email":
        return EmailProvider()
    elif channel == "push":
        return PushProvider()
    elif channel == "in_app":
        return InAppProvider()
    else:
        raise ValueError(f"Unknown notification channel: {channel}")


async def send_notification_async(notification: Notification) -> bool:
    """Send a single notification via its channel"""
    try:
        provider = get_provider(notification.channel)

        result = await provider.send(
            recipient=notification.recipient_address,
            subject=notification.subject or "",
            message=notification.message,
            metadata={
                "notification_type": notification.notification_type,
                "notification_id": str(notification.id)
            }
        )

        return result.get("success", False)
    except Exception as e:
        logger.error(f"Failed to send notification {notification.id}: {e}")
        return False


@shared_task(name="send_pending_notifications", bind=True, max_retries=3)
def send_pending_notifications(self):
    """
    Process all pending notifications and send them
    This task runs continuously or on schedule to ensure all notifications are sent
    """
    db = SessionLocal()
    try:
        # Get all pending notifications
        pending = (
            db.query(Notification)
            .filter(
                Notification.status == "pending",
                Notification.retry_count < Notification.max_retries
            )
            .order_by(Notification.created_at.asc())
            .limit(100)  # Process in batches of 100
            .all()
        )

        if not pending:
            logger.debug("No pending notifications to send")
            return {"processed": 0, "success": 0, "failed": 0}

        logger.info(f"Processing {len(pending)} pending notifications")

        success_count = 0
        failed_count = 0

        # Process each notification
        for notification in pending:
            try:
                # Send the notification (async)
                success = asyncio.run(send_notification_async(notification))

                if success:
                    # Update notification as sent
                    notification.status = "sent"
                    notification.sent_at = datetime.utcnow()
                    success_count += 1
                    logger.info(f"✓ Sent {notification.channel} notification {notification.id}")
                else:
                    # Increment retry count
                    notification.retry_count += 1

                    if notification.retry_count >= notification.max_retries:
                        notification.status = "failed"
                        notification.failed_at = datetime.utcnow()
                        notification.failure_reason = "Max retries exceeded"
                        logger.error(f"✗ Failed to send notification {notification.id} after {notification.retry_count} retries")
                    else:
                        logger.warning(f"⚠ Failed to send notification {notification.id}, will retry ({notification.retry_count}/{notification.max_retries})")

                    failed_count += 1

                db.commit()

            except Exception as e:
                logger.error(f"Error processing notification {notification.id}: {e}")
                notification.retry_count += 1

                if notification.retry_count >= notification.max_retries:
                    notification.status = "failed"
                    notification.failed_at = datetime.utcnow()
                    notification.failure_reason = str(e)

                db.commit()
                failed_count += 1

        result = {
            "processed": len(pending),
            "success": success_count,
            "failed": failed_count
        }

        logger.info(f"Notification processing complete: {result}")
        return result

    except Exception as e:
        logger.error(f"Error in send_pending_notifications task: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@shared_task(name="send_notification_immediately", bind=True)
def send_notification_immediately(self, notification_id: str):
    """
    Send a single notification immediately (for urgent notifications)
    This is called right after creating a notification for immediate delivery
    """
    db = SessionLocal()
    try:
        notification = db.query(Notification).filter(
            Notification.id == notification_id
        ).first()

        if not notification:
            logger.error(f"Notification {notification_id} not found")
            return {"success": False, "error": "Notification not found"}

        if notification.status != "pending":
            logger.warning(f"Notification {notification_id} already processed (status: {notification.status})")
            return {"success": True, "note": "Already processed"}

        # Send the notification
        success = asyncio.run(send_notification_async(notification))

        if success:
            notification.status = "sent"
            notification.sent_at = datetime.utcnow()
            db.commit()
            logger.info(f"✓ Immediately sent {notification.channel} notification {notification_id}")
            return {"success": True}
        else:
            notification.retry_count += 1
            db.commit()
            logger.error(f"✗ Failed to immediately send notification {notification_id}")
            return {"success": False, "error": "Send failed"}

    except Exception as e:
        logger.error(f"Error sending notification immediately {notification_id}: {e}")
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@shared_task(name="cleanup_old_notifications", bind=True)
def cleanup_old_notifications(self, days_old: int = 30):
    """
    Clean up old notifications (delete notifications older than specified days)
    Keeps system performant by removing old notification data
    """
    db = SessionLocal()
    try:
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        # Delete old delivered/failed notifications
        deleted = (
            db.query(Notification)
            .filter(
                Notification.status.in_(["delivered", "failed"]),
                Notification.created_at < cutoff_date
            )
            .delete(synchronize_session=False)
        )

        db.commit()

        logger.info(f"Cleaned up {deleted} old notifications (older than {days_old} days)")
        return {"deleted": deleted}

    except Exception as e:
        logger.error(f"Error cleaning up old notifications: {e}")
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
