from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class PatientBase(BaseModel):
    full_name: str
    card_number: str = Field(..., description="Số CCCD/CMND 12 chữ số")
    date_of_birth: date
    gender: str = Field("MALE", description="MALE, FEMALE, OTHER")
    phone: str
    address: Optional[str] = None
    insurance_number: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    insurance_number: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    patient_code: str
    full_name: str
    card_number: str
    date_of_birth: date
    gender: str
    phone: str
    address: Optional[str] = None
    insurance_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
