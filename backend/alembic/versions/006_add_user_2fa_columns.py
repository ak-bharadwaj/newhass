"""add 2fa columns to users

Revision ID: 006
Revises: 005
Create Date: 2025-10-30
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(length=64), nullable=True))
    # remove server_default to keep model default logic
    op.alter_column('users', 'two_factor_enabled', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
