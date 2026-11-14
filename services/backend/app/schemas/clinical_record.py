from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClinicalRecordBase(BaseModel):
    chief_complaint: Optional[str] = None
    present_illness: Optional[str] = None
    medical_history: Optional[str] = None
    physical_exam: Optional[str] = None
    final_diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_recommendation: Optional[str] = None

class ClinicalRecordUpdate(ClinicalRecordBase):
    pass

class ClinicalRecordResponse(ClinicalRecordBase):
    id: int
    encounter_id: int
    is_locked: bool
    updated_at: datetime

    class Config:
        from_attributes = True
