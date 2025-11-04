"""
In-app notification provider - stores notifications in database for web app pop-ups
"""
import logging
from typing import Dict, Any
from .base import NotificationProvider

logger = logging.getLogger(__name__)


class InAppProvider(NotificationProvider):
    """
    In-app notification provider
    Stores notifications in database for display in web application as pop-ups
    No external sending needed - notifications are fetched via API
    """

    async def send(
        self,
        recipient: str,
        subject: str,
        message: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Mark notification as ready for in-app display
        Since notification is already in database, just log success
        """
        logger.info(f"[IN-APP] Notification ready for user {recipient}: {subject}")

        return {
            "success": True,
            "message_id": f"in_app_{recipient}_{hash(subject)}",
            "provider": "in_app",
            "note": "Notification stored in database for web app display"
        }

    def get_provider_name(self) -> str:
        return "in_app"
