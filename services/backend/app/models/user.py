from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class User(Base):
    __tablename__ = "users"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # 'DOCTOR', 'NURSE', 'ADMIN'
    name_room = Column(String(100), nullable=True, index=True)
    room_id = Column(BigIntPK, ForeignKey("rooms.id"), nullable=True, unique=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def nameRoom(self):
        return self.name_room

    @nameRoom.setter
    def nameRoom(self, value):
        self.name_room = value

    doctor_encounters = relationship("Encounter", back_populates="doctor", foreign_keys="Encounter.doctor_id")
    nurse_encounters = relationship("Encounter", back_populates="nurse", foreign_keys="Encounter.nurse_id")
    uploaded_xrays = relationship("XrayImage", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")
    room = relationship("Room", back_populates="doctor", foreign_keys=[room_id])
