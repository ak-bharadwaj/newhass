"""Create api_keys, message_threads, messages tables

Revision ID: 004
Revises: 003
Create Date: 2025-10-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    existing_tables = set(inspector.get_table_names())

    # api_keys table
    if 'api_keys' not in existing_tables:
        op.create_table(
            'api_keys',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('prefix', sa.String(length=16), nullable=False),
            sa.Column('hashed_key', sa.String(length=128), nullable=False),
            sa.Column('scopes', JSONB, nullable=True),
            sa.Column('created_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('hospital_id', UUID(as_uuid=True), sa.ForeignKey('hospitals.id', ondelete='SET NULL'), nullable=True),
            sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        )
        op.create_index('ix_api_keys_prefix_unique', 'api_keys', ['prefix'], unique=True)

    # message_threads table
    if 'message_threads' not in existing_tables:
        op.create_table(
            'message_threads',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('patient_id', UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
            sa.Column('staff_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('subject', sa.String(length=200), nullable=True),
            sa.Column('is_closed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        )
        op.create_index('ix_message_threads_patient', 'message_threads', ['patient_id'])
        op.create_index('ix_message_threads_staff', 'message_threads', ['staff_user_id'])

    # messages table
    if 'messages' not in existing_tables:
        op.create_table(
            'messages',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('thread_id', UUID(as_uuid=True), sa.ForeignKey('message_threads.id', ondelete='CASCADE'), nullable=False),
            sa.Column('sender_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        )
        op.create_index('ix_messages_thread', 'messages', ['thread_id'])


def downgrade():
    op.drop_index('ix_messages_thread', table_name='messages')
    op.drop_table('messages')
    op.drop_index('ix_message_threads_staff', table_name='message_threads')
    op.drop_index('ix_message_threads_patient', table_name='message_threads')
    op.drop_table('message_threads')
    op.drop_index('ix_api_keys_prefix_unique', table_name='api_keys')
    op.drop_table('api_keys')
