"""
Web Push notification provider for mobile notifications (works when app is closed)
Sends push notifications to mobile browsers even when the web app is not open
"""
import os
import logging
import json
from typing import Dict, Any
from .base import NotificationProvider

logger = logging.getLogger(__name__)


class PushProvider(NotificationProvider):
    """
    Web Push notification provider using VAPID
    Sends push notifications to subscribed devices
    Works even when web app is closed

    Setup:
    1. Generate VAPID keys: python -c "from pywebpush import webpush; import os; print(webpush.generate_vapid_keys())"
    2. Add keys to .env: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
    3. Frontend will subscribe users to push notifications
    """

    def __init__(self):
        self.vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        self.vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        self.vapid_email = os.getenv("VAPID_EMAIL", "noreply@hospital.com")

    async def send(
        self,
        recipient: str,  # Push subscription JSON
        subject: str,
        message: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send web push notification to subscribed device"""

        # Check if VAPID is configured
        if not self.vapid_private_key or not self.vapid_public_key:
            logger.warning("[PUSH] VAPID keys not configured - logging only")
            logger.info(f"[PUSH] Would send push notification: {subject}")
            return {
                "success": True,
                "message_id": f"push_{hash(subject)}",
                "provider": "push",
                "note": "VAPID not configured - logged only"
            }

        try:
            # Use pywebpush to send notification
            from pywebpush import webpush, WebPushException

            # Parse subscription info
            subscription_info = json.loads(recipient)

            # Prepare notification payload
            notification_data = {
                "title": subject or "Hospital Notification",
                "body": message[:100] + ("..." if len(message) > 100 else ""),
                "icon": "/icon-192x192.png",
                "badge": "/badge-72x72.png",
                "data": {
                    "url": "/dashboard",
                    "notification_type": metadata.get("notification_type") if metadata else None,
                }
            }

            # Send push notification
            response = webpush(
                subscription_info=subscription_info,
                data=json.dumps(notification_data),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": f"mailto:{self.vapid_email}",
                    "aud": subscription_info.get("endpoint", "").split("/")[2] if subscription_info.get("endpoint") else None
                }
            )

            logger.info(f"[PUSH] Successfully sent push notification: {subject}")
            return {
                "success": True,
                "message_id": f"push_{hash(subject)}",
                "provider": "push",
                "status_code": response.status_code
            }

        except ImportError:
            logger.warning("[PUSH] pywebpush not installed - install with: pip install pywebpush")
            logger.info(f"[PUSH] Would send push notification: {subject}")
            return {
                "success": True,
                "message_id": f"push_{hash(subject)}",
                "provider": "push",
                "note": "pywebpush not installed - logged only"
            }
        except Exception as e:
            logger.error(f"[PUSH] Failed to send push notification: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "push"
            }

    def get_provider_name(self) -> str:
        return "push"
