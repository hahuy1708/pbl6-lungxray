from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from app.schemas.user import UserResponse

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    target_entity: str
    target_id: Optional[int] = None
    ip_address: Optional[str] = None
    details: Optional[Any] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
