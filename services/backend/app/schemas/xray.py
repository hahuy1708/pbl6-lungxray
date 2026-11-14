from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class PredictionGroup(BaseModel):
    id: str  # "g1", "g2", "g3"
    name: str  # "Mass / Nodule", etc.
    conditions: Optional[List[str]] = None
    probability: float
    threshold: float
    flagged: bool

class AIDiagnosticResultResponse(BaseModel):
    id: int
    xray_image_id: int
    mask_image_url: str
    cropped_image_url: str
    overlay_image_url: Optional[str] = None
    predicted_category: Optional[str] = None
    confidence_score: Optional[float] = None
    predictions: Optional[List[PredictionGroup]] = None
    doctor_comment: Optional[str] = None
    created_at: datetime
    model_version: Optional[str] = "resnet18_crop"
    timing_seconds: Optional[Any] = None

    class Config:
        from_attributes = True

class DoctorCommentUpdate(BaseModel):
    doctor_comment: str

class XrayImageResponse(BaseModel):
    id: int
    encounter_id: int
    image_url: str
    uploaded_by: int
    uploaded_at: datetime
    original_filename: Optional[str] = None
    ai_result: Optional[AIDiagnosticResultResponse] = None

    class Config:
        from_attributes = True
