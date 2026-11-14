import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

# Bắt buộc khóa mã hóa phải hợp lệ, KHÔNG có giá trị mặc định, KHÔNG tự sinh key ngẫu nhiên
if not settings.ENCRYPTION_KEY:
    raise RuntimeError("ENCRYPTION_KEY bắt buộc phải được cấu hình và không được để trống.")

try:
    cipher = Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))
except Exception as e:
    raise RuntimeError(f"ENCRYPTION_KEY không hợp lệ theo chuẩn Fernet AES-256: {e}")

def encrypt_field(raw_text: str) -> str:
    """Mã hóa chuỗi ký tự sang Fernet AES-256 string"""
    if not raw_text:
        return ""
    encrypted_bytes = cipher.encrypt(raw_text.strip().encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_field(encrypted_text: str) -> str:
    """Giải mã Fernet AES-256 string về văn bản thô"""
    if not encrypted_text:
        return ""
    try:
        decrypted_bytes = cipher.decrypt(encrypted_text.strip().encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        # Nếu chuỗi chưa bị mã hóa, trả về nguyên bản
        return encrypted_text

def hash_field(raw_text: str) -> str:
    """Tạo SHA-256 Blind Index phục vụ tìm kiếm chính xác trên CSDL"""
    if not raw_text:
        return ""
    # Kết hợp muối JWT_SECRET để chống Rainbow table attacks
    salted = f"{settings.JWT_SECRET}:{raw_text.strip()}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()
