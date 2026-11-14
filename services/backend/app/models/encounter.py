from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    encounter_code = Column(String(30), unique=True, nullable=False, index=True)
    patient_id = Column(BigIntPK, ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = Column(BigIntPK, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    nurse_id = Column(BigIntPK, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    clinic_room = Column(String(100), nullable=False, index=True)
    queue_number = Column(Integer, nullable=True)
    status = Column(String(20), default="WAITING", nullable=False, index=True)  # WAITING, IN_PROGRESS, COMPLETED, CANCELLED
    admission_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    completion_time = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="encounters")
    doctor = relationship("User", back_populates="doctor_encounters", foreign_keys=[doctor_id])
    nurse = relationship("User", back_populates="nurse_encounters", foreign_keys=[nurse_id])
    
    clinical_record = relationship("ClinicalRecord", back_populates="encounter", uselist=False, cascade="all, delete-orphan")
    xray_images = relationship("XrayImage", back_populates="encounter", cascade="all, delete-orphan")
