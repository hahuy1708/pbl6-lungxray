import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.api.v1 import api_v1_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Khởi động hệ thống Backend LungXray...")
    logger.info("Dịch vụ lưu trữ hình ảnh: %s (Bucket: %s)", settings.STORAGE_PROVIDER, settings.R2_BUCKET_NAME)
    yield
    logger.info("Dừng hệ thống Backend LungXray.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hệ thống Backend hỗ trợ chẩn đoán lâm sàng & quản lý quy trình khám ngoại trú PBL6",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Đăng ký router API v1 (/api/v1/*)
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health Check"])
def api_health(db: Session = Depends(get_db)):
    """Health check tương thích hạ tầng ban đầu"""
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}

@app.get("/health", tags=["Health Check"])
def health():
    return {"status": "healthy"}

@app.get("/", tags=["Health Check"])
def root_health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "api_docs": "/docs",
        "api_version": "v1"
    }
