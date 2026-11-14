from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RoomBase(BaseModel):
    room_code: str
    room_name: str
    is_active: bool = True

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    is_assigned: bool = False
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
