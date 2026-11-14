from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.room import Room
from app.schemas.user import (
    UserCreate, UserUpdate, UserStatusUpdate, UserResponse
)
from app.api.deps import require_roles, get_client_ip
from app.services.audit_service import record_audit_log
from app.utils.code_generator import generate_temp_password

router = APIRouter(prefix="/users", tags=["Quản lý người dùng & Phân quyền (Admin)"])

admin_required = require_roles(["ADMIN"])

@router.get("", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = None,
    name_room: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC002: Lấy danh sách nhân sự kèm vai trò và phòng khám"""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if name_room:
        query = query.filter(User.name_room == name_room)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) | (User.full_name.ilike(search_pattern))
        )
    return query.order_by(User.id.desc()).all()

@router.post("", response_model=UserResponse)
def create_user(
    request: Request,
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Kiểm tra trùng username
    existing = db.query(User).filter(User.username == body.username.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên đăng nhập '{body.username}' đã được sử dụng trên hệ thống."
        )

    # Nếu không nhập pass -> Tự sinh mật khẩu tạm
    raw_password = body.password if body.password else generate_temp_password(8)
    
    assigned_room_id = None
    assigned_room_name = None

    if body.role == "DOCTOR":
        if body.room_id:
            room = db.query(Room).filter(Room.id == body.room_id).first()
            if not room:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Phòng khám được chọn không tồn tại."
                )
            existing_doc = db.query(User).filter(
                User.role == "DOCTOR",
                User.room_id == room.id,
                User.is_active == True
            ).first()
            if existing_doc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phòng khám '{room.room_name}' đã được phân công cho bác sĩ '{existing_doc.full_name}'."
                )
            assigned_room_id = room.id
            assigned_room_name = room.room_name
        elif body.name_room or body.nameRoom:
            r_name = (body.name_room or body.nameRoom).strip()
            room = db.query(Room).filter(Room.room_name == r_name).first()
            if room:
                existing_doc = db.query(User).filter(
                    User.role == "DOCTOR",
                    User.room_id == room.id,
                    User.is_active == True
                ).first()
                if existing_doc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Phòng khám '{room.room_name}' đã được phân công cho bác sĩ '{existing_doc.full_name}'."
                    )
                assigned_room_id = room.id
                assigned_room_name = room.room_name
            else:
                assigned_room_name = r_name

    new_user = User(
        username=body.username.strip(),
        password_hash=get_password_hash(raw_password),
        full_name=body.full_name.strip(),
        role=body.role,
        room_id=assigned_room_id,
        name_room=assigned_room_name,
        phone=body.phone,
        is_active=body.is_active,
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CREATE_USER",
        target_entity="users",
        target_id=new_user.id,
        ip_address=get_client_ip(request),
        details={"username": new_user.username, "role": new_user.role, "full_name": new_user.full_name, "name_room": new_user.name_room}
    )

    new_user.temporary_password = raw_password
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: Request,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC002: Chỉnh sửa thông tin hành chính, đổi vai trò hoặc phòng khám"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhân sự.")

    old_values = {
        "full_name": target_user.full_name,
        "role": target_user.role,
        "name_room": target_user.name_room,
        "phone": target_user.phone
    }

    if body.full_name is not None:
        target_user.full_name = body.full_name.strip()
    if body.role is not None:
        target_user.role = body.role
    room = body.name_room or body.nameRoom
    if room is not None:
        target_user.name_room = room
    if body.phone is not None:
        target_user.phone = body.phone
    if body.is_active is not None:
        target_user.is_active = body.is_active

    db.commit()
    db.refresh(target_user)

    new_values = {
        "full_name": target_user.full_name,
        "role": target_user.role,
        "name_room": target_user.name_room,
        "phone": target_user.phone
    }

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="UPDATE_USER",
        target_entity="users",
        target_id=target_user.id,
        ip_address=get_client_ip(request),
        details={"old": old_values, "new": new_values}
    )

    return target_user

@router.patch("/{user_id}/status", response_model=UserResponse)
def toggle_user_status(
    user_id: int,
    request: Request,
    body: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC002: Khóa hoặc Kích hoạt trạng thái tài khoản"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhân sự.")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản của chính mình.")

    target_user.is_active = body.is_active
    db.commit()
    db.refresh(target_user)

    action_name = "ACTIVATE_USER" if body.is_active else "DEACTIVATE_USER"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action=action_name,
        target_entity="users",
        target_id=target_user.id,
        ip_address=get_client_ip(request),
        details={"username": target_user.username, "new_status": body.is_active}
    )

    return target_user

@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """UC002: Đặt lại mật khẩu tạm thời cho nhân viên"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhân sự.")

    temp_password = generate_temp_password(8)
    target_user.password_hash = get_password_hash(temp_password)
    target_user.must_change_password = True
    target_user.failed_attempts = 0
    target_user.locked_until = None
    db.commit()

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="RESET_PASSWORD",
        target_entity="users",
        target_id=target_user.id,
        ip_address=get_client_ip(request),
        details={"username": target_user.username}
    )

    return {
        "message": f"Đã cấp lại mật khẩu tạm thời cho '{target_user.username}'.",
        "temporary_password": temp_password
    }
