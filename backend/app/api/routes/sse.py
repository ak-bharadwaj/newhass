"""
Server-Sent Events API routes
"""
from fastapi import APIRouter, Depends, Request, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from app.core.dependencies import get_current_user, get_auth_service
from app.core.sse import sse_manager
from app.models.user import User
from app.services.auth_service import AuthService

router = APIRouter()


async def get_user_from_token_query(
    token: str = Query(..., description="JWT token for authentication"),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """
    Get user from query parameter token (for SSE since EventSource doesn't support headers)
    """
    try:
        return auth_service.get_current_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


@router.get("/alerts")
async def stream_alerts(
    request: Request,
    current_user: User = Depends(get_user_from_token_query)
):
    """
    SSE endpoint for real-time alerts

    Streams alerts based on user role:
    - Doctors: Lab results, AI drafts, patient updates
    - Nurses: Emergency vitals, medication reminders
    - Admins: Discharge notifications, system alerts
    - Regional staff: Region-wide alerts

    Usage in frontend:
    ```javascript
    const eventSource = new EventSource(`/api/v1/sse/alerts?token=${token}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Handle alert
    };
    ```
    """
    # Determine channel based on user role and region
    if current_user.role.name in ["super_admin"]:
        channel = "alerts:global"
    elif current_user.region_id:
        channel = f"alerts:{current_user.region_id}"
    else:
        # Personal channel for doctors
        channel = f"doctor:{current_user.id}"

    return StreamingResponse(
        sse_manager.connect(channel, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/doctor/notifications")
async def stream_doctor_notifications(
    request: Request,
    current_user: User = Depends(get_user_from_token_query)
):
    """
    SSE endpoint for doctor-specific notifications
    - Lab results ready
    - AI drafts pending approval
    - Patient critical vitals
    - Discharge requests
    """
    if current_user.role.name != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this stream"
        )

    channel = f"doctor:{current_user.id}"

    return StreamingResponse(
        sse_manager.connect(channel, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/nurse/alerts")
async def stream_nurse_alerts(
    request: Request,
    current_user: User = Depends(get_user_from_token_query)
):
    """
    SSE endpoint for nurse-specific alerts
    - Patient vitals alerts
    - Medication due reminders
    - Task notifications
    """
    if current_user.role.name != "nurse":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only nurses can access this stream"
        )

    # Nurses get region-wide alerts
    channel = f"alerts:{current_user.region_id}" if current_user.region_id else f"nurse:{current_user.id}"

    return StreamingResponse(
        sse_manager.connect(channel, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
