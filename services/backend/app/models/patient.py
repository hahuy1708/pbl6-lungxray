from sqlalchemy import Column, String, Date, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class Patient(Base):
    __tablename__ = "patients"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    patient_code = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    
    # Mã hóa AES Fernet cho dữ liệu nhạy cảm
    card_number = Column(String(255), nullable=False)
    # Blind index hash để tra cứu chính xác
    card_number_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)  # 'MALE', 'FEMALE', 'OTHER'
    
    phone = Column(String(255), nullable=False)
    phone_hash = Column(String(64), nullable=False, index=True)
    
    address = Column(Text, nullable=True)
    insurance_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")
