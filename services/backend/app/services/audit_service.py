from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def record_audit_log(
    db: Session,
    user_id: Optional[int],
    action: str,
    target_entity: str,
    target_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    details: Optional[Any] = None
) -> AuditLog:
    """Ghi nhận bản ghi nhật ký kiểm toán hệ thống (Audit Log) theo UC011"""
    # Không lưu secret, password hay token vào chi tiết audit
    safe_details = details
    if isinstance(details, dict):
        safe_details = {k: v for k, v in details.items() if "password" not in k.lower() and "secret" not in k.lower()}

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_entity=target_entity,
        target_id=target_id,
        ip_address=ip_address,
        details=safe_details
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
