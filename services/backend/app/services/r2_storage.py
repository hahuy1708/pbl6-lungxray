from typing import BinaryIO, Optional
import boto3
from botocore.config import Config
from app.core.config import settings

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name=settings.R2_REGION or "auto",
        config=Config(signature_version="s3v4")
    )

def upload_bytes_to_r2(file_bytes: bytes, key: str, content_type: str = "image/png") -> str:
    """Tải tệp ảnh lên Cloudflare R2 private bucket"""
    client = get_s3_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type
    )
    return key

def upload_fileobj_to_r2(file_obj: BinaryIO, key: str, content_type: str = "image/png") -> str:
    """Stream a seekable file object to the private R2 bucket."""
    client = get_s3_client()
    client.upload_fileobj(
        Fileobj=file_obj,
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        ExtraArgs={"ContentType": content_type},
    )
    return key

def get_object_bytes_from_r2(key: str) -> bytes:
    """Đọc dữ liệu nhị phân của tệp từ R2 private bucket"""
    client = get_s3_client()
    resp = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    return resp["Body"].read()

def generate_presigned_url(key: Optional[str], expires_in: Optional[int] = None) -> str:
    """Tạo Presigned URL có thời hạn truy cập (mặc định 300 giây) cho ảnh trên R2"""
    if not key or not str(key).strip():
        return ""
    
    clean_key = str(key).strip()
    # Chỉ object key nội bộ mới được ký lại; không cho URL public bypass R2.
    if clean_key.startswith("http://") or clean_key.startswith("https://"):
        raise ValueError("Media phải được lưu dưới dạng R2 object key, không phải URL tuyệt đối.")

    # Xóa prefix dẫn xuất thừa nếu có
    if clean_key.startswith("/media/"):
        clean_key = clean_key[len("/media/"):]
    elif clean_key.startswith("media/"):
        clean_key = clean_key[len("media/"):]

    ttl = expires_in if expires_in is not None else settings.R2_PRESIGNED_TTL_SECONDS
    client = get_s3_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": clean_key},
        ExpiresIn=ttl
    )
    return url

def delete_from_r2(key: str) -> None:
    """Xóa tệp khỏi Cloudflare R2"""
    if not key:
        return
    client = get_s3_client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
