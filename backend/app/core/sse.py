"""
Server-Sent Events (SSE) for real-time alerts
"""
import asyncio
import json
import logging
from typing import Dict, Set, AsyncGenerator
from fastapi import Request
from fastapi.responses import StreamingResponse
from datetime import datetime
from uuid import UUID

logger = logging.getLogger(__name__)


class SSEManager:
    """Manager for Server-Sent Events connections"""

    def __init__(self):
        # Store active connections per region/role
        self.connections: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, channel: str, request: Request) -> AsyncGenerator[str, None]:
        """
        Create SSE connection for a channel

        Args:
            channel: Channel identifier (e.g., "alerts:region_uuid" or "alerts:doctor_uuid")
            request: FastAPI request object

        Yields:
            SSE formatted messages
        """
        queue: asyncio.Queue = asyncio.Queue()

        async with self._lock:
            if channel not in self.connections:
                self.connections[channel] = set()
            self.connections[channel].add(queue)

        logger.info(f"SSE connection established for channel: {channel}")

        try:
            # Send initial connection message
            yield self._format_sse({
                "type": "connected",
                "channel": channel,
                "timestamp": datetime.utcnow().isoformat()
            })

            # Send heartbeat every 30 seconds and check for messages
            while True:
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from channel: {channel}")
                    break

                try:
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield self._format_sse(message)
                except asyncio.TimeoutError:
                    # Send heartbeat (comment in SSE protocol)
                    yield ": heartbeat\n\n"

        except asyncio.CancelledError:
            logger.info(f"SSE connection cancelled for channel: {channel}")

        finally:
            # Clean up connection
            async with self._lock:
                if channel in self.connections:
                    self.connections[channel].discard(queue)
                    if not self.connections[channel]:
                        del self.connections[channel]
            logger.info(f"SSE connection closed for channel: {channel}")

    async def broadcast(self, channel: str, message: dict):
        """
        Broadcast message to all connections in a channel

        Args:
            channel: Channel identifier
            message: Message dictionary to send
        """
        async with self._lock:
            if channel not in self.connections:
                logger.debug(f"No active connections for channel: {channel}")
                return

            queues = list(self.connections[channel])

        # Send to all connected clients
        for queue in queues:
            try:
                await queue.put(message)
            except Exception as e:
                logger.error(f"Error sending message to queue: {str(e)}")

        logger.debug(f"Broadcast message to {len(queues)} connections on channel: {channel}")

    async def send_emergency_alert(
        self,
        region_id: UUID,
        patient_id: UUID,
        patient_name: str,
        vital_type: str,
        vital_value: str,
        severity: str = "critical"
    ):
        """
        Send emergency vitals alert to region channel

        Args:
            region_id: Region UUID
            patient_id: Patient UUID
            patient_name: Patient name
            vital_type: Type of vital
            vital_value: Abnormal value
            severity: Alert severity level
        """
        message = {
            "type": "emergency_vitals",
            "severity": severity,
            "patient_id": str(patient_id),
            "patient_name": patient_name,
            "vital_type": vital_type,
            "vital_value": vital_value,
            "timestamp": datetime.utcnow().isoformat(),
            "action_required": True
        }

        await self.broadcast(f"alerts:{region_id}", message)

    async def send_lab_result_notification(
        self,
        doctor_id: UUID,
        patient_name: str,
        test_type: str,
        test_id: UUID
    ):
        """
        Send lab result notification to doctor

        Args:
            doctor_id: Doctor UUID
            patient_name: Patient name
            test_type: Type of lab test
            test_id: Lab test UUID
        """
        message = {
            "type": "lab_result_ready",
            "patient_name": patient_name,
            "test_type": test_type,
            "test_id": str(test_id),
            "timestamp": datetime.utcnow().isoformat(),
            "action": "review_results"
        }

        await self.broadcast(f"doctor:{doctor_id}", message)

    async def send_discharge_complete(
        self,
        region_id: UUID,
        patient_name: str,
        hospital_name: str,
        visit_id: UUID
    ):
        """
        Send discharge completion notification

        Args:
            region_id: Region UUID
            patient_name: Patient name
            hospital_name: Hospital name
            visit_id: Visit UUID
        """
        message = {
            "type": "discharge_complete",
            "patient_name": patient_name,
            "hospital_name": hospital_name,
            "visit_id": str(visit_id),
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.broadcast(f"alerts:{region_id}", message)

    def _format_sse(self, data: dict) -> str:
        """
        Format message as SSE

        Args:
            data: Message data

        Returns:
            Formatted SSE string
        """
        return f"data: {json.dumps(data)}\n\n"


# Global SSE manager instance
sse_manager = SSEManager()
