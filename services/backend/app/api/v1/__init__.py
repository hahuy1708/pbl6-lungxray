from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.rooms import router as rooms_router
from app.api.v1.patients import router as patients_router
from app.api.v1.encounters import router as encounters_router
from app.api.v1.clinical_records import router as clinical_router
from app.api.v1.ai_proxy import router as ai_router
from app.api.v1.reports import router as reports_router
from app.api.v1.audit_logs import router as audit_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(rooms_router)
api_v1_router.include_router(patients_router)
api_v1_router.include_router(encounters_router)
api_v1_router.include_router(clinical_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(audit_router)
