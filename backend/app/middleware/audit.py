"""Middleware to automatically log modifying requests to AuditLog"""
from typing import Optional
from uuid import UUID
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import SessionLocal
from app.core.security import decode_token, verify_token_type
from app.models.audit_log import AuditLog

NIL_UUID = UUID("00000000-0000-0000-0000-000000000000")


class AuditMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        try:
            # Only log write operations that succeeded
            if request.method in {"POST", "PUT", "PATCH", "DELETE"} and response.status_code < 400:
                user_id = self._extract_user_id(request)
                resource_type, resource_id = self._infer_resource(request)
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")

                db = SessionLocal()
                try:
                    log = AuditLog(
                        user_id=user_id,
                        action=request.method,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        notes=f"{request.method} {request.url.path} => {response.status_code}",
                    )
                    db.add(log)
                    db.commit()
                finally:
                    db.close()
        except Exception:
            # Never block the request on audit logging
            pass

        return response

    def _extract_user_id(self, request: Request) -> Optional[UUID]:
        token = None
        auth = request.headers.get("authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
        if not token:
            token = request.cookies.get("access_token")
        if not token:
            return None
        payload = decode_token(token)
        if not payload or not verify_token_type(payload, "access"):
            return None
        sub = payload.get("sub")
        try:
            return UUID(str(sub)) if sub else None
        except Exception:
            return None

    def _infer_resource(self, request: Request) -> tuple[str, UUID]:
        # Heuristic: use first segment after /api/v1 as resource type
        path = request.url.path
        resource_type = "unknown"
        if path.startswith("/api/v1/"):
            rest = path[len("/api/v1/"):]
            if rest:
                resource_type = rest.split("/", 1)[0] or "unknown"
        # Try to find an id in path params
        params = request.scope.get("path_params") or {}
        candidate_keys = [
            "id","patient_id","visit_id","thread_id","key_id","hospital_id","user_id"
        ]
        for k in candidate_keys:
            if k in params:
                try:
                    return resource_type, UUID(str(params[k]))
                except Exception:
                    break
        return resource_type, NIL_UUID
