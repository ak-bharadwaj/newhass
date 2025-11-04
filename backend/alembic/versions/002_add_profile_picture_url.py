"""Add profile_picture_url to users if missing

Revision ID: 002
Revises: 001
Create Date: 2025-10-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'profile_picture_url' not in columns:
        op.add_column('users', sa.Column('profile_picture_url', sa.String(length=500), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'profile_picture_url' in columns:
        op.drop_column('users', 'profile_picture_url')
