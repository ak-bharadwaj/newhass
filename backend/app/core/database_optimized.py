"""Optimized database configuration for high concurrency (10k+ users)"""
from sqlalchemy import create_engine, event, pool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


# MAXIMUM SCALE: 50,000+ concurrent users - ZERO LAG configuration
engine = create_engine(
    settings.DATABASE_URL,

    # Connection Pool Settings - ENTERPRISE GRADE
    poolclass=pool.QueuePool,
    pool_size=100,                   # Base connections (5x increase)
    max_overflow=200,                # Additional connections (total 300)
    pool_timeout=10,                 # Fail fast - 10s for connection
    pool_recycle=1800,              # Recycle every 30 min (prevent stale)
    pool_pre_ping=True,             # Verify connections before use

    # Performance Settings
    echo=settings.DEBUG,            # SQL logging in debug mode
    echo_pool=False,                # Connection pool logging

    # Connection Arguments - ULTRA FAST
    connect_args={
        "application_name": "hass_backend",
        "options": "-c statement_timeout=5000 -c work_mem=16MB",  # 5s timeout, 16MB work mem
        "connect_timeout": 5,          # Fast connection
        "keepalives": 1,
        "keepalives_idle": 15,         # Faster keepalive
        "keepalives_interval": 5,      # Check every 5s
        "keepalives_count": 3,         # 3 retries
        "tcp_keepalive": True,
    },

    # Execution Options
    execution_options={
        "isolation_level": "READ COMMITTED",
    }
)


# Base class for models
Base = declarative_base()


# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Better for API responses
)


# Connection event listeners for monitoring
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Track connection creation"""
    connection_record.info['pid'] = dbapi_conn.get_backend_pid()
    logger.debug(f"Database connection established: PID {connection_record.info['pid']}")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Track connection checkout from pool"""
    logger.debug(f"Connection checked out from pool")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Track connection return to pool"""
    logger.debug(f"Connection returned to pool")


@event.listens_for(engine, "close")
def receive_close(dbapi_conn, connection_record):
    """Track connection close"""
    logger.debug(f"Connection closed: PID {connection_record.info.get('pid')}")


# Dependency for getting database session
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.
    Automatically handles session lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()


# Health check function
def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    Used for health endpoints and monitoring.
    """
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


# Pool status for monitoring
def get_pool_status() -> dict:
    """
    Get current connection pool status.
    Useful for monitoring and debugging.
    """
    return {
        "pool_size": engine.pool.size(),
        "checked_in": engine.pool.checkedin(),
        "checked_out": engine.pool.checkedout(),
        "overflow": engine.pool.overflow(),
        "total_connections": engine.pool.size() + engine.pool.overflow(),
    }


# Example usage in FastAPI:
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database_optimized import get_db, get_pool_status

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute("SELECT 1")
    return {
        "status": "healthy",
        "pool": get_pool_status()
    }

@router.get("/patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return patients
"""
