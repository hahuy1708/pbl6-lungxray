from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class XrayImage(Base):
    __tablename__ = "xray_images"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    encounter_id = Column(BigIntPK, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(255), nullable=False)  # R2 object key
    original_filename = Column(String(255), nullable=True)
    content_type = Column(String(100), nullable=True, default="image/png")
    file_size = Column(Integer, nullable=True)
    uploaded_by = Column(BigIntPK, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    encounter = relationship("Encounter", back_populates="xray_images")
    uploader = relationship("User", back_populates="uploaded_xrays")
    ai_result = relationship("AIDiagnosticResult", back_populates="xray_image", uselist=False, cascade="all, delete-orphan")
