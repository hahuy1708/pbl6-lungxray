import random
import string
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

def generate_patient_code(db: Session) -> str:
    """Tự động sinh mã bệnh nhân theo định dạng BN + 6 chữ số tăng dần (ví dụ BN000001)"""
    try:
        result = db.execute(text("SELECT MAX(id) FROM patients")).scalar()
        next_id = (result or 0) + 1
        return f"BN{next_id:06d}"
    except Exception:
        return f"BN{random.randint(100000, 999999)}"

def generate_encounter_code(db: Session) -> str:
    """Tự động sinh mã lượt khám theo ngày: LK20261102-001"""
    date_prefix = datetime.now().strftime("%Y%m%d")
    try:
        count = db.execute(
            text("SELECT COUNT(*) FROM encounters WHERE encounter_code LIKE :prefix"),
            {"prefix": f"LK{date_prefix}-%"}
        ).scalar()
        next_seq = (count or 0) + 1
        return f"LK{date_prefix}-{next_seq:03d}"
    except Exception:
        return f"LK{date_prefix}-{random.randint(100, 999)}"

def generate_temp_password(length: int = 8) -> str:
    """Tạo mật khẩu tạm thời ngẫu nhiên có chữ hoa, thường và số"""
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))
