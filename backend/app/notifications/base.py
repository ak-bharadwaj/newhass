"""
Base notification provider interface
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class NotificationProvider(ABC):
    """Abstract base class for notification providers"""

    @abstractmethod
    async def send(
        self,
        recipient: str,
        subject: str,
        message: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Send notification
        
        Args:
            recipient: Recipient address (email, phone, etc.)
            subject: Notification subject
            message: Notification message/body
            metadata: Additional metadata
            
        Returns:
            {
                "success": bool,
                "message_id": str (optional),
                "error": str (optional)
            }
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get provider name"""
        pass
