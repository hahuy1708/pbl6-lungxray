from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    encounter_id = Column(BigIntPK, ForeignKey("encounters.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    chief_complaint = Column(Text, nullable=True)
    present_illness = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    physical_exam = Column(Text, nullable=True)
    final_diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    follow_up_recommendation = Column(Text, nullable=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    encounter = relationship("Encounter", back_populates="clinical_record")
