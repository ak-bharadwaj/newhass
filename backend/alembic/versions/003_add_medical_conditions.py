"""Add medical_conditions to patients if missing

Revision ID: 003
Revises: 002
Create Date: 2025-10-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('patients')]
    if 'medical_conditions' not in columns:
        # Use JSONB if Postgres; fallback to JSON for other DBs
        try:
            op.add_column('patients', sa.Column('medical_conditions', JSONB, nullable=True))
        except Exception:
            op.add_column('patients', sa.Column('medical_conditions', sa.JSON(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('patients')]
    if 'medical_conditions' in columns:
        op.drop_column('patients', 'medical_conditions')
