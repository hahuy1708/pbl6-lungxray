from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.user import User
from app.models.clinical_record import ClinicalRecord
from app.schemas.encounter import (
    EncounterCreate, AssignQueueRequest, CloseEncounterRequest,
    EncounterResponse, RoomQueueStatsResponse
)
from app.api.deps import get_current_user, require_roles, get_client_ip, verify_encounter_access
from app.services.queue_service import get_clinic_room_stats, assign_patient_to_room
from app.services.audit_service import record_audit_log
from app.services.r2_storage import generate_presigned_url
from app.utils.code_generator import generate_encounter_code
from app.api.v1.patients import format_patient_response

router = APIRouter(prefix="/encounters", tags=["Lượt khám & Điều phối Hàng đợi"])

nurse_or_admin_required = require_roles(["NURSE", "ADMIN"])

def build_encounter_response(enc: Encounter) -> dict:
    """Đóng gói dữ liệu Encounter đầy đủ kèm giải mã thông tin bệnh nhân và ký Presigned URL cho ảnh"""
    formatted_xrays = []
    for x in enc.xray_images:
        ai_resp = None
        if x.ai_result:
            preds = []
            if x.ai_result.predictions_payload and isinstance(x.ai_result.predictions_payload, dict):
                preds = x.ai_result.predictions_payload.get("predictions", [])
            
            ai_resp = {
                "id": x.ai_result.id,
                "xray_image_id": x.ai_result.xray_image_id,
                "mask_image_url": generate_presigned_url(x.ai_result.mask_image_url),
                "cropped_image_url": generate_presigned_url(x.ai_result.cropped_image_url),
                "overlay_image_url": generate_presigned_url(x.ai_result.overlay_image_url),
                "predicted_category": x.ai_result.predicted_category,
                "confidence_score": float(x.ai_result.confidence_score) if x.ai_result.confidence_score is not None else 0.0,
                "predictions": preds,
                "doctor_comment": x.ai_result.doctor_comment,
                "created_at": x.ai_result.created_at,
                "model_version": x.ai_result.model_version,
                "timing_seconds": x.ai_result.segmentation_metadata.get("timing_seconds") if x.ai_result.segmentation_metadata else None
            }

        formatted_xrays.append({
            "id": x.id,
            "encounter_id": x.encounter_id,
            "image_url": generate_presigned_url(x.image_url),
            "uploaded_by": x.uploaded_by,
            "uploaded_at": x.uploaded_at,
            "original_filename": x.original_filename,
            "ai_result": ai_resp
        })

    return {
        "id": enc.id,
        "encounter_code": enc.encounter_code,
        "patient_id": enc.patient_id,
        "doctor_id": enc.doctor_id,
        "nurse_id": enc.nurse_id,
        "clinic_room": enc.clinic_room,
        "queue_number": enc.queue_number,
        "status": enc.status,
        "admission_time": enc.admission_time,
        "completion_time": enc.completion_time,
        "patient": format_patient_response(enc.patient) if enc.patient else None,
        "doctor": enc.doctor,
        "nurse": enc.nurse,
        "clinical_record": enc.clinical_record,
        "xray_images": formatted_xrays
    }

@router.get("/rooms-status", response_model=List[RoomQueueStatsResponse])
def get_rooms_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "NURSE", "ADMIN"])),
):
    """UC004: Thống kê tình trạng tải các phòng khám trong ngày phục vụ gợi ý phòng trống"""
    return get_clinic_room_stats(db)

@router.get("/queue")
def get_room_queue(
    clinic_room: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "NURSE", "ADMIN"])),
):
    """UC004: Lấy danh sách hàng đợi (WAITING, IN_PROGRESS) hoặc lịch sử đã khám (COMPLETED) trong ngày"""
    today_start = datetime.combine(date.today(), datetime.min.time())
    query = db.query(Encounter).filter(
        (Encounter.admission_time >= today_start) | (Encounter.completion_time >= today_start)
    )

    if clinic_room:
        query = query.filter(Encounter.clinic_room == clinic_room)

    if status_filter:
        query = query.filter(Encounter.status == status_filter)
        if status_filter == "COMPLETED":
            encounters = query.order_by(Encounter.completion_time.desc(), Encounter.id.desc()).all()
            return [build_encounter_response(enc) for enc in encounters]
    else:
        query = query.filter(Encounter.status.in_(["WAITING", "IN_PROGRESS"]))

    encounters = query.order_by(Encounter.queue_number.asc()).all()
    return [build_encounter_response(enc) for enc in encounters]

@router.post("", response_model=EncounterResponse)
def create_encounter(
    request: Request,
    body: EncounterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(nurse_or_admin_required)
):
    """UC003 / UC004: Khởi tạo lượt khám mới cho bệnh nhân trong ngày"""
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bệnh nhân.")

    code = generate_encounter_code(db)
    new_enc = Encounter(
        encounter_code=code,
        patient_id=patient.id,
        nurse_id=current_user.id if current_user.role == "NURSE" else None,
        clinic_room=body.clinic_room or "Phòng Khám Hô Hấp 101",
        status="WAITING"
    )
    db.add(new_enc)
    db.flush()

    record = ClinicalRecord(encounter_id=new_enc.id)
    db.add(record)
    db.commit()
    db.refresh(new_enc)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CREATE_ENCOUNTER",
        target_entity="encounters",
        target_id=new_enc.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": new_enc.encounter_code, "clinic_room": new_enc.clinic_room}
    )

    return build_encounter_response(new_enc)

@router.post("/{encounter_id}/assign-queue", response_model=EncounterResponse)
def assign_queue_room(
    encounter_id: int,
    body: AssignQueueRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(nurse_or_admin_required)
):
    """UC004: Phân bổ bệnh nhân vào phòng khám và cấp số thứ tự STT"""
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")

    updated_enc = assign_patient_to_room(db, enc, body.clinic_room.strip())

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="ASSIGN_QUEUE",
        target_entity="encounters",
        target_id=updated_enc.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": updated_enc.encounter_code, "room": updated_enc.clinic_room, "queue_number": updated_enc.queue_number}
    )

    return build_encounter_response(updated_enc)

@router.patch("/{encounter_id}/start-exam", response_model=EncounterResponse)
def start_exam(
    encounter_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC006: Bác sĩ bấm 'Gọi Khám', chuyển trạng thái từ WAITING sang IN_PROGRESS"""
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")
    verify_encounter_access(enc, current_user)

    if enc.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ca khám này đã hoàn tất, không thể gọi lại.")

    enc.status = "IN_PROGRESS"
    enc.doctor_id = current_user.id
    db.commit()
    db.refresh(enc)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="START_EXAM",
        target_entity="encounters",
        target_id=enc.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": enc.encounter_code, "doctor": current_user.full_name}
    )

    return build_encounter_response(enc)

@router.put("/{encounter_id}/close", response_model=EncounterResponse)
def close_encounter(
    encounter_id: int,
    body: CloseEncounterRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC010: Bác sĩ xác nhận chẩn đoán cuối cùng, hoàn tất ca khám và khóa bệnh án"""
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")
    verify_encounter_access(enc, current_user)

    if not body.final_diagnosis.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chẩn đoán xác định không được để trống khi hoàn tất ca khám."
        )

    rec = enc.clinical_record
    if not rec:
        rec = ClinicalRecord(encounter_id=enc.id)
        db.add(rec)
        db.flush()

    rec.final_diagnosis = body.final_diagnosis.strip()
    rec.treatment_plan = body.treatment_plan.strip()
    if body.follow_up_recommendation:
        rec.follow_up_recommendation = body.follow_up_recommendation.strip()
    rec.is_locked = True

    enc.status = "COMPLETED"
    enc.completion_time = datetime.utcnow()
    enc.doctor_id = current_user.id

    db.commit()
    db.refresh(enc)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CLOSE_ENCOUNTER",
        target_entity="encounters",
        target_id=enc.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": enc.encounter_code, "final_diagnosis": rec.final_diagnosis}
    )

    return build_encounter_response(enc)

@router.get("/{encounter_id}", response_model=EncounterResponse)
def get_encounter_detail(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")
    verify_encounter_access(enc, current_user)
    return build_encounter_response(enc)
