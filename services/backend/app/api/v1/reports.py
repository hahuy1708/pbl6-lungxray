from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.encounter import Encounter
from app.models.user import User
from app.api.deps import get_current_user, get_client_ip, verify_encounter_access
from app.services.pdf_service import generate_medical_report_pdf
from app.services.audit_service import record_audit_log

router = APIRouter(tags=["Kết xuất Báo cáo & Phiếu khám (Bác sĩ & Y tá)"])

def _generate_pdf_response(encounter_id: int, request: Request, db: Session, current_user: User):
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")
    verify_encounter_access(enc, current_user)

    try:
        pdf_bytes = generate_medical_report_pdf(enc)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi khởi tạo tệp PDF: {str(e)}"
        )

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="EXPORT_PDF",
        target_entity="encounters",
        target_id=enc.id,
        ip_address=get_client_ip(request),
        details={"encounter_code": enc.encounter_code, "patient_code": enc.patient.patient_code if enc.patient else None}
    )

    filename = f"PhieuKham_{enc.encounter_code}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/encounters/{encounter_id}/export-pdf")
def export_medical_report_pdf(
    encounter_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """UC009: Xuất phiếu khám và kết quả ngoại trú định dạng PDF"""
    return _generate_pdf_response(encounter_id, request, db, current_user)

@router.get("/reports/encounters/{encounter_id}/pdf")
def export_medical_report_pdf_alt(
    encounter_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Đường dẫn thay thế: /reports/encounters/{id}/pdf"""
    return _generate_pdf_response(encounter_id, request, db, current_user)
