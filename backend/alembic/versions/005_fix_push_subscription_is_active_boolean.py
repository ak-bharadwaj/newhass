"""Fix push_subscriptions.is_active to Boolean

Revision ID: 005
Revises: 004
Create Date: 2025-10-28

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # Drop index if exists (depends on column type)
    try:
        op.drop_index('ix_push_subscription_user_active', table_name='push_subscriptions')
    except Exception:
        pass

    # Convert string values to boolean and alter column type
    # Ensure a temporary boolean column to safely convert, then swap
    op.add_column('push_subscriptions', sa.Column('is_active_tmp', sa.Boolean(), server_default=sa.text('true'), nullable=False))

    # Populate temporary column based on existing textual values
    conn.execute(sa.text("""
        UPDATE push_subscriptions
        SET is_active_tmp = CASE
            WHEN LOWER(COALESCE(is_active::text, 'true')) IN ('true','t','1','on','yes','y') THEN TRUE
            ELSE FALSE
        END
    """))

    # Drop old column and rename tmp to original name
    op.drop_column('push_subscriptions', 'is_active')
    op.alter_column('push_subscriptions', 'is_active_tmp', new_column_name='is_active')

    # Recreate composite index
    op.create_index('ix_push_subscription_user_active', 'push_subscriptions', ['user_id', 'is_active'])


def downgrade():
    conn = op.get_bind()
    # Drop index
    try:
        op.drop_index('ix_push_subscription_user_active', table_name='push_subscriptions')
    except Exception:
        pass

    # Add back as string to reverse (default to 'true')
    op.add_column('push_subscriptions', sa.Column('is_active_tmp', sa.String(length=50), nullable=False, server_default='true'))

    # Convert boolean back to 'true'/'false'
    conn.execute(sa.text("""
        UPDATE push_subscriptions
        SET is_active_tmp = CASE WHEN is_active THEN 'true' ELSE 'false' END
    """))

    op.drop_column('push_subscriptions', 'is_active')
    op.alter_column('push_subscriptions', 'is_active_tmp', new_column_name='is_active')

    # Recreate original index
    op.create_index('ix_push_subscription_user_active', 'push_subscriptions', ['user_id', 'is_active'])
