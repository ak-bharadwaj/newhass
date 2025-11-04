"""expand case_sheet fields

Revision ID: b7257749c56a
Revises: 005
Create Date: 2025-10-29 04:57:25.878794

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'b7257749c56a'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Idempotent upgrade: add missing columns and drop legacy ones if present."""
    bind = op.get_bind()
    inspector = inspect(bind)

    def has_column(table: str, column: str) -> bool:
        return any(col['name'] == column for col in inspector.get_columns(table))

    # Safe add_column helpers
    if not has_column('case_sheets', 'duration_of_symptoms'):
        op.add_column('case_sheets', sa.Column('duration_of_symptoms', sa.String(length=200), nullable=True))
    if not has_column('case_sheets', 'past_surgical_history'):
        op.add_column('case_sheets', sa.Column('past_surgical_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'allergies'):
        op.add_column('case_sheets', sa.Column('allergies', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'current_medications'):
        op.add_column('case_sheets', sa.Column('current_medications', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'social_history'):
        op.add_column('case_sheets', sa.Column('social_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'general_appearance'):
        op.add_column('case_sheets', sa.Column('general_appearance', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'vital_signs_on_admission'):
        op.add_column('case_sheets', sa.Column('vital_signs_on_admission', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'cardiovascular_system'):
        op.add_column('case_sheets', sa.Column('cardiovascular_system', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'respiratory_system'):
        op.add_column('case_sheets', sa.Column('respiratory_system', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'gastrointestinal_system'):
        op.add_column('case_sheets', sa.Column('gastrointestinal_system', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'central_nervous_system'):
        op.add_column('case_sheets', sa.Column('central_nervous_system', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'musculoskeletal_system'):
        op.add_column('case_sheets', sa.Column('musculoskeletal_system', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'other_systems'):
        op.add_column('case_sheets', sa.Column('other_systems', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'provisional_diagnosis'):
        op.add_column('case_sheets', sa.Column('provisional_diagnosis', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'differential_diagnosis'):
        op.add_column('case_sheets', sa.Column('differential_diagnosis', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'final_diagnosis'):
        op.add_column('case_sheets', sa.Column('final_diagnosis', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'lab_investigations'):
        op.add_column('case_sheets', sa.Column('lab_investigations', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'imaging_studies'):
        op.add_column('case_sheets', sa.Column('imaging_studies', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'special_investigations'):
        op.add_column('case_sheets', sa.Column('special_investigations', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'medications_prescribed'):
        op.add_column('case_sheets', sa.Column('medications_prescribed', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'procedures_performed'):
        op.add_column('case_sheets', sa.Column('procedures_performed', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'iv_fluids'):
        op.add_column('case_sheets', sa.Column('iv_fluids', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'diet_advice'):
        op.add_column('case_sheets', sa.Column('diet_advice', sa.Text(), nullable=True))
    if not has_column('case_sheets', 'intake_output_chart'):
        op.add_column('case_sheets', sa.Column('intake_output_chart', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'consultation_notes'):
        op.add_column('case_sheets', sa.Column('consultation_notes', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'operation_notes'):
        op.add_column('case_sheets', sa.Column('operation_notes', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'condition_on_discharge'):
        op.add_column('case_sheets', sa.Column('condition_on_discharge', sa.String(length=100), nullable=True))
    if not has_column('case_sheets', 'discharge_medications'):
        op.add_column('case_sheets', sa.Column('discharge_medications', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if not has_column('case_sheets', 'discharge_advice'):
        op.add_column('case_sheets', sa.Column('discharge_advice', sa.Text(), nullable=True))

    # Safe drop of legacy columns
    if has_column('case_sheets', 'diagnosis'):
        op.drop_column('case_sheets', 'diagnosis')
    if has_column('case_sheets', 'physical_examination'):
        op.drop_column('case_sheets', 'physical_examination')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('case_sheets', sa.Column('physical_examination', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.add_column('case_sheets', sa.Column('diagnosis', sa.TEXT(), autoincrement=False, nullable=True))
    op.drop_column('case_sheets', 'discharge_advice')
    op.drop_column('case_sheets', 'discharge_medications')
    op.drop_column('case_sheets', 'condition_on_discharge')
    op.drop_column('case_sheets', 'operation_notes')
    op.drop_column('case_sheets', 'consultation_notes')
    op.drop_column('case_sheets', 'intake_output_chart')
    op.drop_column('case_sheets', 'diet_advice')
    op.drop_column('case_sheets', 'iv_fluids')
    op.drop_column('case_sheets', 'procedures_performed')
    op.drop_column('case_sheets', 'medications_prescribed')
    op.drop_column('case_sheets', 'special_investigations')
    op.drop_column('case_sheets', 'imaging_studies')
    op.drop_column('case_sheets', 'lab_investigations')
    op.drop_column('case_sheets', 'final_diagnosis')
    op.drop_column('case_sheets', 'differential_diagnosis')
    op.drop_column('case_sheets', 'provisional_diagnosis')
    op.drop_column('case_sheets', 'other_systems')
    op.drop_column('case_sheets', 'musculoskeletal_system')
    op.drop_column('case_sheets', 'central_nervous_system')
    op.drop_column('case_sheets', 'gastrointestinal_system')
    op.drop_column('case_sheets', 'respiratory_system')
    op.drop_column('case_sheets', 'cardiovascular_system')
    op.drop_column('case_sheets', 'vital_signs_on_admission')
    op.drop_column('case_sheets', 'general_appearance')
    op.drop_column('case_sheets', 'social_history')
    op.drop_column('case_sheets', 'current_medications')
    op.drop_column('case_sheets', 'allergies')
    op.drop_column('case_sheets', 'past_surgical_history')
    op.drop_column('case_sheets', 'duration_of_symptoms')
    # ### end Alembic commands ###
