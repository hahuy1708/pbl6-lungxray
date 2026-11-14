from sqlalchemy import Column, String, Numeric, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base, BigIntPK

class AIDiagnosticResult(Base):
    __tablename__ = "ai_diagnostic_results"

    id = Column(BigIntPK, primary_key=True, autoincrement=True, index=True)
    xray_image_id = Column(BigIntPK, ForeignKey("xray_images.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    mask_image_url = Column(String(255), nullable=False)      # R2 object key cho mask
    cropped_image_url = Column(String(255), nullable=False)   # R2 object key cho crop
    overlay_image_url = Column(String(255), nullable=True)    # R2 object key cho overlay
    predicted_category = Column(String(100), nullable=True)   # Tóm tắt kết quả
    confidence_score = Column(Numeric(5, 4), nullable=True)   # Điểm tin cậy cao nhất
    predictions_payload = Column(JSON, nullable=True)         # JSON lưu chi tiết 3 nhóm classifier g1, g2, g3
    segmentation_metadata = Column(JSON, nullable=True)       # JSON lưu bbox, lung_area_ratio, timing
    model_version = Column(String(50), default="resnet18_crop", nullable=False)
    doctor_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    xray_image = relationship("XrayImage", back_populates="ai_result")
