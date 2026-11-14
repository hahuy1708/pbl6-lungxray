from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.patient import PatientResponse
from app.schemas.user import UserResponse
from app.schemas.clinical_record import ClinicalRecordResponse
from app.schemas.xray import XrayImageResponse

class EncounterCreate(BaseModel):
    patient_id: int
    clinic_room: Optional[str] = "Phòng Khám Hô Hấp 101"

class AssignQueueRequest(BaseModel):
    clinic_room: str

class CloseEncounterRequest(BaseModel):
    final_diagnosis: str
    treatment_plan: str
    follow_up_recommendation: Optional[str] = None

class EncounterResponse(BaseModel):
    id: int
    encounter_code: str
    patient_id: int
    doctor_id: Optional[int] = None
    nurse_id: Optional[int] = None
    clinic_room: str
    queue_number: Optional[int] = None
    status: str
    admission_time: datetime
    completion_time: Optional[datetime] = None
    
    patient: Optional[PatientResponse] = None
    doctor: Optional[UserResponse] = None
    nurse: Optional[UserResponse] = None
    clinical_record: Optional[ClinicalRecordResponse] = None
    xray_images: List[XrayImageResponse] = []

    class Config:
        from_attributes = True

class RoomQueueStatsResponse(BaseModel):
    code: str
    name: str
    department_code: Optional[str] = None
    doctor_name: Optional[str] = None
    is_available: Optional[bool] = True
    total_today: int
    waiting_count: int
    in_progress_count: int
    max_capacity: int
    is_overloaded: bool
    load_percentage: float
