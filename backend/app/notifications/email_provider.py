"""
Email notification provider using SMTP (Gmail free service)
"""
import os
import logging
from typing import Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .base import NotificationProvider

logger = logging.getLogger(__name__)


class EmailProvider(NotificationProvider):
    """
    Email provider using Gmail SMTP (free service)
    Requires Gmail SMTP configuration in environment
    
    Setup: 
    1. Create a Gmail account or use existing
    2. Enable 2-factor authentication
    3. Generate an App Password at https://myaccount.google.com/apppasswords
    4. Set SMTP_USER (your gmail) and SMTP_PASSWORD (app password) in .env
    """

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_user or "noreply@hospital.com")
        self.use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    async def send(
        self,
        recipient: str,
        subject: str,
        message: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send email notification via Gmail SMTP"""
        
        # Check if SMTP is configured
        if not self.smtp_user or not self.smtp_password:
            logger.warning("[EMAIL] SMTP not configured - logging only")
            logger.info(f"[EMAIL] Would send to {recipient}: {subject}")
            logger.info(f"[EMAIL] Message: {message[:100]}...")
            return {
                "success": True,
                "message_id": f"email_{recipient}_{hash(subject)}",
                "provider": "email",
                "note": "SMTP not configured - logged only"
            }

        try:
            # Use aiosmtplib for async SMTP (install: pip install aiosmtplib)
            import aiosmtplib
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = self.from_email
            msg["To"] = recipient
            msg["Subject"] = subject
            
            # Create plain text and HTML versions
            text_part = MIMEText(message, "plain")
            html_part = MIMEText(f"<pre>{message}</pre>", "html")
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=self.use_tls,
            )
            
            logger.info(f"[EMAIL] Successfully sent to {recipient}: {subject}")
            return {
                "success": True,
                "message_id": f"email_{recipient}_{hash(subject)}",
                "provider": "email"
            }
            
        except ImportError:
            # Fall back to logging if aiosmtplib not installed
            logger.warning("[EMAIL] aiosmtplib not installed - install with: pip install aiosmtplib")
            logger.info(f"[EMAIL] Would send to {recipient}: {subject}")
            return {
                "success": True,
                "message_id": f"email_{recipient}_{hash(subject)}",
                "provider": "email",
                "note": "aiosmtplib not installed - logged only"
            }
        except Exception as e:
            logger.error(f"[EMAIL] Failed to send to {recipient}: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "email"
            }

    def get_provider_name(self) -> str:
        return "email"
