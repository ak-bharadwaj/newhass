"""
Rate limiting middleware
"""
import time
import logging
from typing import Callable
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self):
        self.requests = defaultdict(list)
        self.blocked_ips = {}

    def is_allowed(
        self,
        client_ip: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> tuple[bool, int]:
        """
        Check if request is allowed based on rate limit

        Args:
            client_ip: Client IP address
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            tuple: (is_allowed, retry_after_seconds)
        """
        now = time.time()
        window_start = now - window_seconds

        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            blocked_until = self.blocked_ips[client_ip]
            if now < blocked_until:
                return False, int(blocked_until - now)
            else:
                # Unblock
                del self.blocked_ips[client_ip]

        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > window_start
        ]

        # Check rate limit
        if len(self.requests[client_ip]) >= max_requests:
            # Block for 5 minutes
            self.blocked_ips[client_ip] = now + 300
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return False, 300

        # Add current request
        self.requests[client_ip].append(now)
        return True, 0

    def cleanup(self):
        """Clean up old entries (run periodically)"""
        now = time.time()
        # Remove entries older than 1 hour
        cutoff = now - 3600

        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                req_time for req_time in self.requests[ip]
                if req_time > cutoff
            ]
            if not self.requests[ip]:
                del self.requests[ip]


# Global rate limiter
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting"""

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for health check, metrics, and essential auth endpoints
        bypass_paths = {
            "/health",
            "/metrics",
            "/api/v1/auth/login",
            "/api/v1/auth/me",
            "/api/v1/auth/refresh",
            "/api/v1/auth/logout",
        }
        if request.url.path in bypass_paths:
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Check rate limit
        is_allowed, retry_after = rate_limiter.is_allowed(
            client_ip,
            self.max_requests,
            self.window_seconds
        )

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining = self.max_requests - len(rate_limiter.requests.get(client_ip, []))
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.window_seconds))

        return response
