"""Case sheet model for INPATIENT visits with detailed event timeline"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Date, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from app.core.database import Base


class CaseSheet(Base):
    """
    Comprehensive case sheet for INPATIENT visits only.
    
    Contains detailed timeline of all events:
    - Vitals recorded (with nurse acknowledgment)
    - Medications administered (with nurse acknowledgment)
    - Doctor visits (with acknowledgment)
    - Progress notes
    - Procedures
    - All events logged chronologically
    """
    __tablename__ = "case_sheets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    case_number = Column(String(50), nullable=False)
    admission_date = Column(DateTime(timezone=True), nullable=False)
    discharge_date = Column(DateTime(timezone=True), nullable=True)
    
    # ===== SECTION 1: PRESENTING COMPLAINTS =====
    chief_complaint = Column(Text, nullable=False)
    present_illness = Column(Text, nullable=True)  # History of Present Illness (HPI)
    duration_of_symptoms = Column(String(200), nullable=True)
    
    # ===== SECTION 2: PAST HISTORY =====
    past_medical_history = Column(JSONB, nullable=True)  # Previous illnesses, surgeries
    past_surgical_history = Column(JSONB, nullable=True)
    allergies = Column(JSONB, nullable=True)  # Drug allergies, food allergies
    current_medications = Column(JSONB, nullable=True)  # Medications patient is taking
    
    # ===== SECTION 3: FAMILY & SOCIAL HISTORY =====
    family_history = Column(Text, nullable=True)  # Hereditary conditions
    social_history = Column(JSONB, nullable=True)  # Smoking, alcohol, occupation
    
    # ===== SECTION 4: GENERAL EXAMINATION =====
    general_appearance = Column(Text, nullable=True)  # Built, nourishment, consciousness
    vital_signs_on_admission = Column(JSONB, nullable=True)  # BP, pulse, temp, RR, SpO2
    
    # ===== SECTION 5: SYSTEMIC EXAMINATION =====
    cardiovascular_system = Column(Text, nullable=True)
    respiratory_system = Column(Text, nullable=True)
    gastrointestinal_system = Column(Text, nullable=True)
    central_nervous_system = Column(Text, nullable=True)
    musculoskeletal_system = Column(Text, nullable=True)
    other_systems = Column(JSONB, nullable=True)
    
    # ===== SECTION 6: PROVISIONAL/FINAL DIAGNOSIS =====
    provisional_diagnosis = Column(Text, nullable=True)
    differential_diagnosis = Column(JSONB, nullable=True)  # List of possible diagnoses
    final_diagnosis = Column(Text, nullable=True)
    
    # ===== SECTION 7: INVESTIGATIONS =====
    lab_investigations = Column(JSONB, nullable=True)  # CBC, LFT, RFT, etc.
    imaging_studies = Column(JSONB, nullable=True)  # X-ray, CT, MRI, Ultrasound
    special_investigations = Column(JSONB, nullable=True)  # ECG, Echo, etc.
    
    # ===== SECTION 8: TREATMENT & MANAGEMENT =====
    treatment_plan = Column(Text, nullable=True)
    medications_prescribed = Column(JSONB, nullable=True)  # Drug name, dose, frequency, route
    procedures_performed = Column(JSONB, nullable=True)
    iv_fluids = Column(JSONB, nullable=True)  # IV fluid management
    diet_advice = Column(Text, nullable=True)
    
    # ===== SECTION 9: DAILY PROGRESS NOTES =====
    # Uses progress_notes JSONB array (already exists)
    
    # ===== SECTION 10: VITAL SIGNS CHART =====
    # Uses event_timeline JSONB array (already exists)
    
    # ===== SECTION 11: INTAKE-OUTPUT CHART =====
    intake_output_chart = Column(JSONB, nullable=True)  # Fluid balance monitoring
    
    # ===== SECTION 12: CONSULTATION NOTES =====
    consultation_notes = Column(JSONB, nullable=True)  # Specialist consultations
    
    # ===== SECTION 13: OPERATION NOTES (if surgery performed) =====
    operation_notes = Column(JSONB, nullable=True)
    
    # ===== SECTION 14: DISCHARGE DETAILS =====
    condition_on_discharge = Column(String(100), nullable=True)  # Improved, Stable, LAMA, Expired
    discharge_medications = Column(JSONB, nullable=True)
    discharge_advice = Column(Text, nullable=True)
    
    # Discharge information
    discharge_summary = Column(Text, nullable=True)
    follow_up_instructions = Column(Text, nullable=True)
    
    # Event timeline - JSONB array of all events with acknowledgments
    # Each event: {type, timestamp, data, acknowledged_by, acknowledged_at, ack_notes}
    event_timeline = Column(JSONB, nullable=True, default=list)
    
    # Progress notes - separate from event timeline
    progress_notes = Column(JSONB, nullable=True, default=list)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    last_updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    patient = relationship("Patient")
    visit = relationship("Visit")
    hospital = relationship("Hospital")
    created_by_user = relationship("User", foreign_keys=[created_by])
    last_updated_by_user = relationship("User", foreign_keys=[last_updated_by])
    
    # Indexes
    __table_args__ = (
        Index("ix_case_sheet_patient_admission", "patient_id", "admission_date"),
        Index("ix_case_sheet_hospital_case_number", "hospital_id", "case_number", unique=True),
    )
    
    @staticmethod
    def can_view(case_sheet, user_role: str) -> bool:
        """Check if user role can view case sheets"""
        allowed_roles = ['super_admin', 'regional_admin', 'manager', 'doctor', 'nurse']
        return user_role in allowed_roles
    
    @staticmethod
    def can_edit(case_sheet, user_role: str) -> bool:
        """Check if user role can edit case sheets"""
        allowed_roles = ['super_admin', 'manager', 'doctor']
        return user_role in allowed_roles
    
    def log_event(self, event_type: str, event_data: dict, user_id: UUID, user_name: str, user_role: str):
        """
        Log an event to the case sheet timeline.
        
        Event types:
        - vital_recorded: Vitals taken
        - vital_acknowledged: Nurse acknowledged vitals
        - medication_prescribed: Doctor prescribed medication
        - medication_administered: Nurse administered medication
        - doctor_visit: Doctor examined patient
        - procedure: Procedure performed
        - lab_test_ordered: Lab test requested
        - lab_result_received: Lab results available
        """
        if not self.event_timeline:
            self.event_timeline = []
        
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": event_data,
            "by_user_id": str(user_id),
            "by_user_name": user_name,
            "by_user_role": user_role
        }
        
        self.event_timeline.append(event)
        self.updated_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<CaseSheet {self.case_number} - Patient: {self.patient_id}>"
