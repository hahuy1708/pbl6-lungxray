"""Initial schema for PBL6 LungXray

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-14 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Rooms
    op.create_table(
        'rooms',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('room_code', sa.String(length=50), nullable=False),
        sa.Column('room_name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'], unique=False)
    op.create_index(op.f('ix_rooms_room_code'), 'rooms', ['room_code'], unique=True)
    op.create_index(op.f('ix_rooms_room_name'), 'rooms', ['room_name'], unique=True)

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('name_room', sa.String(length=100), nullable=True),
        sa.Column('room_id', sa.BigInteger(), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('failed_attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('locked_until', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('room_id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_name_room'), 'users', ['name_room'], unique=False)

    # 3. Patients
    op.create_table(
        'patients',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('patient_code', sa.String(length=30), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('card_number', sa.String(length=255), nullable=False),
        sa.Column('card_number_hash', sa.String(length=64), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('gender', sa.String(length=10), nullable=False),
        sa.Column('phone', sa.String(length=255), nullable=False),
        sa.Column('phone_hash', sa.String(length=64), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('insurance_number', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)
    op.create_index(op.f('ix_patients_patient_code'), 'patients', ['patient_code'], unique=True)
    op.create_index(op.f('ix_patients_card_number_hash'), 'patients', ['card_number_hash'], unique=True)
    op.create_index(op.f('ix_patients_phone_hash'), 'patients', ['phone_hash'], unique=False)

    # 4. Encounters
    op.create_table(
        'encounters',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('encounter_code', sa.String(length=30), nullable=False),
        sa.Column('patient_id', sa.BigInteger(), nullable=False),
        sa.Column('doctor_id', sa.BigInteger(), nullable=True),
        sa.Column('nurse_id', sa.BigInteger(), nullable=True),
        sa.Column('clinic_room', sa.String(length=100), nullable=False),
        sa.Column('queue_number', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='WAITING'),
        sa.Column('admission_time', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completion_time', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['nurse_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_encounters_id'), 'encounters', ['id'], unique=False)
    op.create_index(op.f('ix_encounters_encounter_code'), 'encounters', ['encounter_code'], unique=True)
    op.create_index(op.f('ix_encounters_patient_id'), 'encounters', ['patient_id'], unique=False)
    op.create_index(op.f('ix_encounters_doctor_id'), 'encounters', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_encounters_clinic_room'), 'encounters', ['clinic_room'], unique=False)
    op.create_index(op.f('ix_encounters_status'), 'encounters', ['status'], unique=False)

    # 5. Clinical Records
    op.create_table(
        'clinical_records',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('encounter_id', sa.BigInteger(), nullable=False),
        sa.Column('chief_complaint', sa.Text(), nullable=True),
        sa.Column('present_illness', sa.Text(), nullable=True),
        sa.Column('medical_history', sa.Text(), nullable=True),
        sa.Column('physical_exam', sa.Text(), nullable=True),
        sa.Column('final_diagnosis', sa.Text(), nullable=True),
        sa.Column('treatment_plan', sa.Text(), nullable=True),
        sa.Column('follow_up_recommendation', sa.Text(), nullable=True),
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('encounter_id')
    )
    op.create_index(op.f('ix_clinical_records_id'), 'clinical_records', ['id'], unique=False)
    op.create_index(op.f('ix_clinical_records_encounter_id'), 'clinical_records', ['encounter_id'], unique=True)

    # 6. Xray Images
    op.create_table(
        'xray_images',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('encounter_id', sa.BigInteger(), nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=True),
        sa.Column('content_type', sa.String(length=100), nullable=True, server_default='image/png'),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_by', sa.BigInteger(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_xray_images_id'), 'xray_images', ['id'], unique=False)
    op.create_index(op.f('ix_xray_images_encounter_id'), 'xray_images', ['encounter_id'], unique=False)

    # 7. AI Diagnostic Results
    op.create_table(
        'ai_diagnostic_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('xray_image_id', sa.BigInteger(), nullable=False),
        sa.Column('mask_image_url', sa.String(length=255), nullable=False),
        sa.Column('cropped_image_url', sa.String(length=255), nullable=False),
        sa.Column('overlay_image_url', sa.String(length=255), nullable=True),
        sa.Column('predicted_category', sa.String(length=100), nullable=True),
        sa.Column('confidence_score', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('predictions_payload', sa.JSON(), nullable=True),
        sa.Column('segmentation_metadata', sa.JSON(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=False, server_default='resnet18_crop'),
        sa.Column('doctor_comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['xray_image_id'], ['xray_images.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('xray_image_id')
    )
    op.create_index(op.f('ix_ai_diagnostic_results_id'), 'ai_diagnostic_results', ['id'], unique=False)
    op.create_index(op.f('ix_ai_diagnostic_results_xray_image_id'), 'ai_diagnostic_results', ['xray_image_id'], unique=True)

    # 8. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('target_entity', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.BigInteger(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_target_entity'), 'audit_logs', ['target_entity'], unique=False)
    op.create_index(op.f('ix_audit_logs_target_id'), 'audit_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('ai_diagnostic_results')
    op.drop_table('xray_images')
    op.drop_table('clinical_records')
    op.drop_table('encounters')
    op.drop_table('patients')
    op.drop_table('users')
    op.drop_table('rooms')
