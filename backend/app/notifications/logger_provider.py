"""
Logger notification provider for development
"""
import logging
from typing import Dict, Any
from .base import NotificationProvider

logger = logging.getLogger(__name__)


class LoggerProvider(NotificationProvider):
    """
    Development notification provider that logs to console
    No external dependencies, works immediately
    """

    async def send(
        self,
        recipient: str,
        subject: str,
        message: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Log notification to console"""
        
        logger.info("=" * 80)
        logger.info(f"NOTIFICATION (Logger Provider)")
        logger.info(f"To: {recipient}")
        logger.info(f"Subject: {subject}")
        logger.info("-" * 80)
        logger.info(message)
        logger.info("=" * 80)
        
        if metadata:
            logger.info(f"Metadata: {metadata}")
        
        return {
            "success": True,
            "message_id": f"log_{recipient}_{hash(subject)}",
            "provider": "logger"
        }

    def get_provider_name(self) -> str:
        return "logger"
