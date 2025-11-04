"""Add qualification column to users if missing

Revision ID: 007
Revises: 006
Create Date: 2025-11-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'qualification' not in columns:
        op.add_column('users', sa.Column('qualification', sa.String(length=200), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'qualification' in columns:
        op.drop_column('users', 'qualification')
