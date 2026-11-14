from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class Room(Base):
    __tablename__ = "rooms"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    room_code = Column(String(50), unique=True, nullable=False, index=True)
    room_name = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    doctor = relationship("User", back_populates="room", uselist=False)
