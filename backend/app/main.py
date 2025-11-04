"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import PlainTextResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.metrics import metrics_collector, MetricsMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.middleware.audit import AuditMiddleware
from app.core.config import settings as app_settings

# Configure logging early
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Optional Sentry initialization (if DSN provided)
try:
    if app_settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(
            dsn=app_settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.2 if app_settings.DEBUG else 0.05,
            profiles_sample_rate=0.0,
            environment="development" if app_settings.DEBUG else "production",
            release=app_settings.VERSION,
        )
        logger.info("Sentry initialized")
except Exception as e:
    logger.warning(f"Sentry init skipped: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Hospital Automation System API")
    logger.info(f"Version: {settings.VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    yield
    logger.info("Shutting down Hospital Automation System API")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add metrics middleware
app.add_middleware(MetricsMiddleware)

# Add rate limiting middleware (100 requests per minute per IP)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Add response compression (improves payload sizes ~70% for large responses)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Automatic audit logging for all modifying requests
app.add_middleware(AuditMiddleware)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

@app.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint
    
    Returns metrics in Prometheus text format:
    - HTTP request counts and durations
    - Error rates
    - Active requests
    - Celery task metrics
    - Database query counts
    - Cache hit/miss rates
    """
    return PlainTextResponse(
        content=metrics_collector.get_prometheus_metrics(),
        media_type="text/plain"
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Hospital Automation System API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


# Include API routers
from app.api.routes import auth
from app.api.routes import admin
from app.api.routes import regions
from app.api.routes import hospitals
from app.api.routes import audit_logs
from app.api.routes import patients
from app.api.routes import clinical
from app.api.routes import beds
from app.api.routes import appointments
from app.api.routes import ai
from app.api.routes import files
from app.api.routes import visits
from app.api.routes import sse
from app.api.routes import ai_intelligence
from app.api.routes import patient_search
from app.api.routes import case_sheets_clean as case_sheets
from app.api.routes import admission
from app.api.routes import analytics
from app.api.routes import notifications
from app.api.routes import push
from app.api.routes import qr_codes
from app.api.routes import voice_to_text
from app.api.routes import pharmacy
from app.api.routes import api_keys
from app.api.routes import messages
from app.api.routes import public
from app.api.v1.endpoints import ai_analytics

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(regions.router, prefix=f"{settings.API_V1_STR}/regions", tags=["Regions"])
app.include_router(hospitals.router, prefix=f"{settings.API_V1_STR}/hospitals", tags=["Hospitals"])
app.include_router(audit_logs.router, prefix=f"{settings.API_V1_STR}/audit-logs", tags=["Audit Logs"])
app.include_router(patients.router, prefix=f"{settings.API_V1_STR}/patients", tags=["Patients"])
app.include_router(patient_search.router, prefix=f"{settings.API_V1_STR}/patient-search", tags=["Global Patient Search"])
app.include_router(clinical.router, prefix=f"{settings.API_V1_STR}/clinical", tags=["Clinical"])
app.include_router(case_sheets.router, prefix=f"{settings.API_V1_STR}/case-sheets", tags=["Case Sheets"])
app.include_router(beds.router, prefix=f"{settings.API_V1_STR}/beds", tags=["Beds"])
app.include_router(appointments.router, prefix=f"{settings.API_V1_STR}/appointments", tags=["Appointments"])
app.include_router(admission.router, prefix=f"{settings.API_V1_STR}/admission", tags=["Admission & Discharge"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(ai_analytics.router, prefix=f"{settings.API_V1_STR}/ai-analytics", tags=["AI Analytics"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["Notifications"])
app.include_router(push.router, prefix=f"{settings.API_V1_STR}/push", tags=["Push Notifications"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI"])
app.include_router(files.router, prefix=f"{settings.API_V1_STR}/files", tags=["Files"])
app.include_router(visits.router, prefix=f"{settings.API_V1_STR}/visits", tags=["Visits"])
app.include_router(sse.router, prefix=f"{settings.API_V1_STR}/sse", tags=["Real-Time"])
app.include_router(ai_intelligence.router, prefix=f"{settings.API_V1_STR}/ai-intelligence", tags=["AI Intelligence"])
app.include_router(qr_codes.router, prefix=f"{settings.API_V1_STR}/qr", tags=["QR Codes"])
app.include_router(voice_to_text.router, prefix=f"{settings.API_V1_STR}/voice-to-text", tags=["Voice to Text"])
app.include_router(pharmacy.router, prefix=f"{settings.API_V1_STR}/pharmacy", tags=["Pharmacy"])
app.include_router(api_keys.router, prefix=f"{settings.API_V1_STR}/admin/api-keys", tags=["Admin", "API Keys"])
app.include_router(messages.router, prefix=f"{settings.API_V1_STR}/messages", tags=["Messaging"]) 
app.include_router(public.router, prefix=f"{settings.API_V1_STR}/public", tags=["Public"]) 
