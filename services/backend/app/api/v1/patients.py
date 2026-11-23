from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.models.encounter import Encounter
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.api.deps import get_current_user, get_client_ip, require_roles
from app.services.audit_service import record_audit_log
from app.services.r2_storage import generate_presigned_url
from app.utils.crypto import encrypt_field, decrypt_field, hash_field
from app.utils.code_generator import generate_patient_code

router = APIRouter(prefix="/patients", tags=["Quản lý Bệnh nhân (Y tá & Bác sĩ)"])

nurse_or_admin_required = require_roles(["NURSE", "ADMIN"])

def format_patient_response(patient: Patient) -> dict:
    """Giải mã các trường nhạy cảm trước khi trả về Client"""
    return {
        "id": patient.id,
        "patient_code": patient.patient_code,
        "full_name": patient.full_name,
        "card_number": decrypt_field(patient.card_number),
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "phone": decrypt_field(patient.phone),
        "address": patient.address,
        "insurance_number": patient.insurance_number,
        "created_at": patient.created_at
    }

def restrict_doctor_to_assigned_patients(query, current_user: User):
    if current_user.role == "DOCTOR":
        query = query.join(Encounter, Encounter.patient_id == Patient.id).filter(
            Encounter.doctor_id == current_user.id
        ).distinct()
    return query

@router.get("", response_model=List[PatientResponse])
def list_patients(
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """UC005: Tra cứu bệnh nhân theo Mã BN, CCCD, SĐT hoặc Họ tên"""
    db_query = restrict_doctor_to_assigned_patients(db.query(Patient), current_user)

    if query and query.strip():
        q = query.strip()
        card_h = hash_field(q)
        phone_h = hash_field(q)
        
        db_query = db_query.filter(
            (Patient.patient_code.ilike(f"%{q}%")) |
            (Patient.card_number_hash == card_h) |
            (Patient.phone_hash == phone_h) |
            (Patient.full_name.ilike(f"%{q}%"))
        )

    patients = db_query.order_by(Patient.id.desc()).limit(50).all()
    return [format_patient_response(p) for p in patients]

@router.post("", response_model=PatientResponse)
def create_patient(
    request: Request,
    body: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(nurse_or_admin_required)
):
    """UC003: Tiếp nhận, đăng ký bệnh nhân mới & kiểm tra trùng CCCD"""
    raw_card = body.card_number.strip()
    card_h = hash_field(raw_card)

    existing = db.query(Patient).filter(Patient.card_number_hash == card_h).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Bệnh nhân với số CCCD '{raw_card}' đã tồn tại trên hệ thống.",
                "existing_patient": format_patient_response(existing)
            }
        )

    p_code = generate_patient_code(db)
    new_patient = Patient(
        patient_code=p_code,
        full_name=body.full_name.strip(),
        card_number=encrypt_field(raw_card),
        card_number_hash=card_h,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        phone=encrypt_field(body.phone.strip()),
        phone_hash=hash_field(body.phone.strip()),
        address=body.address.strip() if body.address else None,
        insurance_number=body.insurance_number.strip() if body.insurance_number else None
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CREATE_PATIENT",
        target_entity="patients",
        target_id=new_patient.id,
        ip_address=get_client_ip(request),
        details={"patient_code": new_patient.patient_code, "full_name": new_patient.full_name}
    )

    return format_patient_response(new_patient)

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_detail(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bệnh nhân.")
    if current_user.role == "DOCTOR" and not db.query(Encounter.id).filter(
        Encounter.patient_id == patient_id, Encounter.doctor_id == current_user.id
    ).first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không được phân công khám bệnh nhân này.")
    return format_patient_response(patient)

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    request: Request,
    body: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(nurse_or_admin_required)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bệnh nhân.")

    old_details = {
        "full_name": patient.full_name,
        "phone": decrypt_field(patient.phone),
        "address": patient.address
    }

    if body.full_name is not None:
        patient.full_name = body.full_name.strip()
    if body.phone is not None:
        patient.phone = encrypt_field(body.phone.strip())
        patient.phone_hash = hash_field(body.phone.strip())
    if body.address is not None:
        patient.address = body.address.strip()
    if body.insurance_number is not None:
        patient.insurance_number = body.insurance_number.strip()

    db.commit()
    db.refresh(patient)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="UPDATE_PATIENT",
        target_entity="patients",
        target_id=patient.id,
        ip_address=get_client_ip(request),
        details={"old": old_details, "new": {"full_name": patient.full_name, "phone": body.phone, "address": patient.address}}
    )

    return format_patient_response(patient)

@router.get("/{patient_id}/history")
def get_patient_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """UC008: Dòng thời gian (Timeline) toàn bộ lịch sử các đợt khám của bệnh nhân"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bệnh nhân.")

    encounters_query = db.query(Encounter).filter(Encounter.patient_id == patient_id)
    if current_user.role == "DOCTOR":
        encounters_query = encounters_query.filter(Encounter.doctor_id == current_user.id)
    encounters = encounters_query.order_by(Encounter.admission_time.desc()).all()
    if current_user.role == "DOCTOR" and not encounters:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không được phân công khám bệnh nhân này.")

    history_list = []
    for enc in encounters:
        rec = enc.clinical_record
        xray_list = []
        for x in enc.xray_images:
            ai_data = None
            if x.ai_result:
                preds = []
                if x.ai_result.predictions_payload and isinstance(x.ai_result.predictions_payload, dict):
                    preds = x.ai_result.predictions_payload.get("predictions", [])

                ai_data = {
                    "predicted_category": x.ai_result.predicted_category,
                    "confidence_score": float(x.ai_result.confidence_score) if x.ai_result.confidence_score is not None else 0.0,
                    "mask_image_url": generate_presigned_url(x.ai_result.mask_image_url),
                    "cropped_image_url": generate_presigned_url(x.ai_result.cropped_image_url),
                    "overlay_image_url": generate_presigned_url(x.ai_result.overlay_image_url),
                    "doctor_comment": x.ai_result.doctor_comment,
                    "predictions": preds
                }
            xray_list.append({
                "id": x.id,
                "image_url": generate_presigned_url(x.image_url),
                "uploaded_at": x.uploaded_at,
                "ai_result": ai_data
            })

        history_list.append({
            "encounter_id": enc.id,
            "encounter_code": enc.encounter_code,
            "date": enc.admission_time,
            "completion_time": enc.completion_time,
            "status": enc.status,
            "clinic_room": enc.clinic_room,
            "doctor_name": enc.doctor.full_name if enc.doctor else "Chưa phân công",
            "chief_complaint": rec.chief_complaint if rec else None,
            "final_diagnosis": rec.final_diagnosis if rec else None,
            "treatment_plan": rec.treatment_plan if rec else None,
            "follow_up_recommendation": rec.follow_up_recommendation if rec else None,
            "xray_images": xray_list
        })

    return history_list
