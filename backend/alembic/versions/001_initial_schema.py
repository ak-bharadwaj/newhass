"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2025-01-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create all base tables"""
    # This migration creates all initial tables from SQLAlchemy models
    # Using Base.metadata.create_all() instead of individual commands
    print("Creating initial database schema from models...")

    from app.core.database import Base, engine
    Base.metadata.create_all(bind=engine)

    print("✅ Initial schema created successfully!")


def downgrade():
    """Drop all tables"""
    print("Dropping all tables...")

    from app.core.database import Base, engine
    Base.metadata.drop_all(bind=engine)
