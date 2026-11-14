from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigIntPK, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    target_entity = Column(String(50), nullable=False, index=True)
    target_id = Column(BigIntPK, nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")
