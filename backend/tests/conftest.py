"""
Pytest configuration and fixtures
"""
import sys
from pathlib import Path

# Ensure project root is on sys.path so 'app' imports resolve when pytest changes CWD
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base
# Import models to ensure SQLAlchemy metadata is populated before create_all
import app.models  # noqa: F401
from app.main import app
from app.core.database import get_db

# Test database URL (use file-based SQLite so the schema persists across connections)
TEST_DATABASE_URL = "sqlite:///./test.db"

# Compatibility: map PostgreSQL-specific types to SQLite equivalents for DDL
# so models using UUID / JSONB can create tables under SQLite for fast unit tests.
try:
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
    from sqlalchemy.ext.compiler import compiles
    from sqlalchemy.types import TypeEngine

    @compiles(PG_UUID, "sqlite")
    def _compile_uuid_sqlite(element: TypeEngine, compiler, **kw):  # type: ignore[override]
        return "CHAR(36)"

    @compiles(PG_JSONB, "sqlite")
    def _compile_jsonb_sqlite(element: TypeEngine, compiler, **kw):  # type: ignore[override]
        return "JSON"

    # Also map INET to TEXT for SQLite
    from sqlalchemy.dialects.postgresql import INET as PG_INET  # type: ignore

    @compiles(PG_INET, "sqlite")
    def _compile_inet_sqlite(element: TypeEngine, compiler, **kw):  # type: ignore[override]
        return "TEXT"
except Exception:
    # If imports fail (older SQLAlchemy), tests will skip DDL fallback
    pass

@pytest.fixture(scope="function")
def test_db():
    """Create test database session"""
    engine = create_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables for all models (metadata populated by importing app.models)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with database override"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "role_name": "doctor"
    }


@pytest.fixture
def sample_patient_data():
    """Sample patient data for testing"""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "blood_group": "O+",
        "phone": "+1234567890",
        "email": "patient@example.com"
    }
