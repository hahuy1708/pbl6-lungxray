import os
from typing import List, Literal
from cryptography.fernet import Fernet
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hệ thống Phân đoạn Vùng phổi & Hỗ trợ Lâm sàng PBL6"
    API_V1_STR: str = "/api/v1"

    # Database (MySQL 8.4)
    DATABASE_URL: str

    # Security
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Data field encryption (AES-256 Fernet key)
    # Bắt buộc hợp lệ khi khởi động, không có giá trị mặc định
    ENCRYPTION_KEY: str

    # AI Service internal endpoints
    SEGMENTATION_API_URL: str = "http://segmentation-api:8000/segment/crops"

    # Cloudflare R2 Storage
    STORAGE_PROVIDER: str
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_ENDPOINT_URL: str
    R2_REGION: str
    R2_PRESIGNED_TTL_SECONDS: int

    # Namespace for bucket: dev (local) prod (server)
    # Cleanup chỉ đụng tới object trong namespace này.
    R2_KEY_PREFIX: Literal["dev", "prod"]

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://www.lungxray.me"
    ]

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("ENCRYPTION_KEY không được để trống khi khởi động hệ thống.")
        try:
            # Thử khởi tạo Fernet cipher để kiểm tra tính hợp lệ của key 32-byte url-safe base64
            Fernet(v.strip().encode("utf-8"))
        except Exception as exc:
            raise ValueError(f"ENCRYPTION_KEY không hợp lệ theo chuẩn Fernet: {exc}") from exc
        return v.strip()

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("JWT_SECRET không được để trống khi khởi động hệ thống.")
        placeholder = "paste_random_secret_string_here"
        if v.strip() == placeholder:
            raise ValueError("JWT_SECRET đang dùng placeholder mặc định, vui lòng cấu hình secret thật.")
        if len(v.strip()) < 16:
            raise ValueError("JWT_SECRET phải có độ dài tối thiểu 16 ký tự để đảm bảo an toàn.")
        return v.strip()

    @model_validator(mode="after")
    def validate_r2_config(self):
        if self.STORAGE_PROVIDER.lower() != "r2":
            raise ValueError("STORAGE_PROVIDER phải là 'r2'; hệ thống không hỗ trợ storage provider khác.")
        required = {
            "R2_ACCOUNT_ID": self.R2_ACCOUNT_ID,
            "R2_ACCESS_KEY_ID": self.R2_ACCESS_KEY_ID,
            "R2_SECRET_ACCESS_KEY": self.R2_SECRET_ACCESS_KEY,
            "R2_BUCKET_NAME": self.R2_BUCKET_NAME,
            "R2_ENDPOINT_URL": self.R2_ENDPOINT_URL,
            "R2_REGION": self.R2_REGION,
        }
        missing = [name for name, value in required.items() if not value.strip()]
        if missing:
            raise ValueError(f"Thiếu cấu hình R2 bắt buộc: {', '.join(missing)}")
        if self.R2_PRESIGNED_TTL_SECONDS <= 0:
            raise ValueError("R2_PRESIGNED_TTL_SECONDS phải lớn hơn 0.")
        return self

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
