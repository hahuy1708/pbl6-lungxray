from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.encounter import Encounter
from app.models.clinical_record import ClinicalRecord
from app.models.user import User
from app.schemas.clinical_record import ClinicalRecordUpdate, ClinicalRecordResponse
from app.api.deps import require_roles, get_client_ip
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/encounters", tags=["Hồ sơ Khám Lâm sàng (Bác sĩ)"])

@router.get("/{encounter_id}/clinical-record", response_model=ClinicalRecordResponse)
def get_clinical_record(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "NURSE", "ADMIN"])),
):
    """Lấy thông tin bệnh án lâm sàng của lượt khám"""
    rec = db.query(ClinicalRecord).filter(ClinicalRecord.encounter_id == encounter_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có bệnh án cho lượt khám này.")
    return rec

@router.put("/{encounter_id}/clinical-record", response_model=ClinicalRecordResponse)
def save_clinical_record_draft(
    encounter_id: int,
    body: ClinicalRecordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC006: Bác sĩ nhập và lưu nháp thông tin khám lâm sàng từng phần"""
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")

    rec = db.query(ClinicalRecord).filter(ClinicalRecord.encounter_id == encounter_id).first()
    if not rec:
        rec = ClinicalRecord(encounter_id=encounter_id)
        db.add(rec)
        db.flush()

    if rec.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hồ sơ bệnh án này đã hoàn tất và bị khóa, không thể chỉnh sửa."
        )

    # Cập nhật các trường
    update_data = body.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rec, field, value)

    db.commit()
    db.refresh(rec)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="SAVE_CLINICAL_DRAFT",
        target_entity="clinical_records",
        target_id=rec.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": enc.encounter_code, "updated_fields": list(update_data.keys())}
    )

    return rec
