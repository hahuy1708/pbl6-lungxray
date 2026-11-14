from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from app.schemas.user import UserResponse
from app.api.deps import get_current_user, get_client_ip
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/auth", tags=["Xác thực & Tài khoản"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """UC001: Đăng nhập hệ thống, kiểm tra brute-force 5 lần khóa 15 phút"""
    ip_addr = get_client_ip(request)
    user = db.query(User).filter(User.username == body.username.strip()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác."
        )

    # 1. Kiểm tra tài khoản có đang bị khóa bởi Quản trị viên
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị khóa bởi Quản trị viên."
        )

    # 2. Kiểm tra tài khoản có đang trong thời gian tạm khóa 15 phút do nhập sai 5 lần
    now = datetime.utcnow()
    if user.locked_until and user.locked_until > now:
        remaining_seconds = int((user.locked_until - now).total_seconds())
        remaining_minutes = max(1, remaining_seconds // 60)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Tài khoản bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng thử lại sau {remaining_minutes} phút."
        )

    # 3. Kiểm tra tính khớp của mật khẩu
    if not verify_password(body.password, user.password_hash):
        user.failed_attempts += 1
        remaining_tries = MAX_FAILED_ATTEMPTS - user.failed_attempts

        if user.failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            db.commit()
            
            record_audit_log(
                db=db,
                user_id=user.id,
                action="ACCOUNT_LOCKED_BRUTE_FORCE",
                target_entity="users",
                target_id=user.id,
                ip_address=ip_addr,
                details={"reason": "5 consecutive failed login attempts", "locked_until": user.locked_until.isoformat()}
            )

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Hệ thống tạm khóa tài khoản trong {LOCKOUT_MINUTES} phút."
            )

        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sai mật khẩu. Bạn còn {remaining_tries} lần thử trước khi tài khoản bị khóa tạm thời."
        )

    # Đăng nhập thành công -> Reset số lần sai và mở khóa
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()

    record_audit_log(
        db=db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        target_entity="users",
        target_id=user.id,
        ip_address=ip_addr,
        details={"username": user.username, "role": user.role}
    )

    token = create_access_token(
        subject=user.username,
        extra_claims={
            "user_id": user.id,
            "role": user.role,
            "full_name": user.full_name,
            "name_room": user.name_room,
            "nameRoom": user.name_room
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        name_room=user.name_room,
        nameRoom=user.name_room,
        must_change_password=user.must_change_password
    )

@router.post("/change-password")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Đổi mật khẩu người dùng"""
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác."
        )

    current_user.password_hash = get_password_hash(body.new_password)
    current_user.must_change_password = False
    db.commit()

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CHANGE_PASSWORD",
        target_entity="users",
        target_id=current_user.id,
        ip_address=get_client_ip(request),
        details={"username": current_user.username}
    )

    return {"message": "Đổi mật khẩu thành công."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Lấy thông tin tài khoản đang đăng nhập"""
    return current_user

@router.patch("/doctor-status", response_model=UserResponse)
def toggle_doctor_status(
    is_available: bool,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bác sĩ chủ động bật/tắt trạng thái hoạt động (sẵn sàng tiếp nhận bệnh)"""
    if current_user.role != "DOCTOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Bác sĩ mới có quyền thay đổi trạng thái hoạt động này."
        )

    current_user.is_available = is_available
    db.commit()
    db.refresh(current_user)

    status_str = "SẴN SÀNG NHẬN BỆNH" if is_available else "TẠM NGHỈ TIẾP NHẬN"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="UPDATE_DOCTOR_STATUS",
        target_entity="users",
        target_id=current_user.id,
        ip_address=get_client_ip(request),
        details={"status": status_str, "is_available": is_available}
    )

    return current_user
