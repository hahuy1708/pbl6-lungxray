from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    full_name: str
    role: str  # DOCTOR, NURSE, ADMIN
    room_id: Optional[int] = None
    name_room: Optional[str] = None
    nameRoom: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_available: bool = True

    @model_validator(mode="before")
    @classmethod
    def sync_rooms(cls, data: Any) -> Any:
        if isinstance(data, dict):
            room = data.get("name_room") or data.get("nameRoom")
            data["name_room"] = room
            data["nameRoom"] = room
        return data

class UserCreate(UserBase):
    password: Optional[str] = None  # Nếu không nhập sẽ tự sinh password tạm

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    room_id: Optional[int] = None
    name_room: Optional[str] = None
    nameRoom: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(UserBase):
    id: int
    must_change_password: bool
    temporary_password: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
