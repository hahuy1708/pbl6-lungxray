import os
import uuid
import base64
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Response
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.encounter import Encounter
from app.models.xray_image import XrayImage
from app.models.ai_result import AIDiagnosticResult
from app.models.user import User
from app.schemas.xray import XrayImageResponse, DoctorCommentUpdate, AIDiagnosticResultResponse
from app.api.deps import require_roles, get_client_ip, verify_encounter_access
from app.services.audit_service import record_audit_log

logger = logging.getLogger("ai_proxy")
router = APIRouter(prefix="", tags=["Chẩn đoán X-quang & AI Trợ lý (Bác sĩ)"])

MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}

@router.post("/encounters/{encounter_id}/xray", response_model=XrayImageResponse)
async def upload_xray_image(
    encounter_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC007: Tải tệp ảnh chụp X-quang phổi 2D lên hệ thống Cloudflare R2"""
    # Serialize uploads for one encounter so simultaneous requests cannot bypass the one-image rule.
    enc = db.query(Encounter).filter(Encounter.id == encounter_id).with_for_update().first()
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám.")
    verify_encounter_access(enc, current_user)
    if enc.status == "COMPLETED" or (enc.clinical_record and enc.clinical_record.is_locked):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lượt khám đã khóa, không thể thay ảnh.")
    if db.query(XrayImage.id).filter(XrayImage.encounter_id == enc.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lượt khám đã có ảnh X-quang. Hãy xóa ảnh chưa phân tích trước khi tải ảnh thay thế.")

    filename = file.filename or "xray.png"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ảnh không hợp lệ. Vui lòng sử dụng tệp ảnh X-quang định dạng .PNG hoặc .JPG."
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước tệp vượt quá giới hạn tối đa 20MB."
        )

    # Sinh object key R2 theo cấu trúc quy chuẩn
    xray_uuid = uuid.uuid4().hex
    r2_key = f"{settings.R2_KEY_PREFIX}/patients/{enc.patient_id}/encounters/{enc.id}/xray/{xray_uuid}/original{ext}"
    content_type = file.content_type or ("image/png" if ext == ".png" else "image/jpeg")

    # Upload trực tiếp lên Cloudflare R2 private bucket
    try:
        upload_bytes_to_r2(contents, r2_key, content_type=content_type)
    except Exception as e:
        logger.exception("Lỗi khi tải ảnh lên Cloudflare R2")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể lưu trữ tệp lên R2: {str(e)}"
        )

    xray_img = XrayImage(
        encounter_id=enc.id,
        image_url=r2_key,
        original_filename=filename,
        content_type=content_type,
        file_size=len(contents),
        uploaded_by=current_user.id
    )
    db.add(xray_img)
    db.commit()
    db.refresh(xray_img)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="UPLOAD_XRAY",
        target_entity="xray_images",
        target_id=xray_img.id,
        ip_address=get_client_ip(request),
        details={"filename": filename, "r2_key": r2_key, "encounter_code": enc.encounter_code}
    )

    # Trả về presigned URL có thời hạn cho client
    presigned_url = generate_presigned_url(xray_img.image_url)
    return {
        "id": xray_img.id,
        "encounter_id": xray_img.encounter_id,
        "image_url": presigned_url,
        "uploaded_by": xray_img.uploaded_by,
        "uploaded_at": xray_img.uploaded_at,
        "original_filename": xray_img.original_filename,
        "ai_result": None
    }

@router.delete("/xray/{xray_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_xray_image(
    xray_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    xray = db.query(XrayImage).filter(XrayImage.id == xray_id).first()
    if not xray:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ảnh X-quang.")

    enc = xray.encounter
    if enc.status == "COMPLETED" or (enc.clinical_record and enc.clinical_record.is_locked):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lượt khám đã khóa, không thể xóa ảnh.")
    if xray.ai_result:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ảnh đã có kết quả AI; không thể xóa khỏi hồ sơ.")

    xray_prefix = os.path.dirname(xray.image_url)
    try:
        for key in (xray.image_url, f"{xray_prefix}/mask.png", f"{xray_prefix}/crop.png", f"{xray_prefix}/overlay.png"):
            delete_from_r2(key)
    except Exception as e:
        logger.exception("Không thể xóa ảnh X-quang khỏi R2: %s", xray.image_url)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Không thể xóa ảnh khỏi R2: {str(e)}")

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="DELETE_XRAY",
        target_entity="xray_images",
        target_id=xray.id,
        ip_address=get_client_ip(request),
        details={"filename": xray.original_filename, "encounter_id": enc.id}
    )
    db.delete(xray)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/xray/{xray_id}/run-ai", response_model=AIDiagnosticResultResponse)
async def trigger_ai_diagnosis(
    xray_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC007: Kích hoạt pipeline AI U-Net & ResNet18 phân loại 3 nhóm nguy cơ (Không có Mock Mode)"""
    xray = db.query(XrayImage).filter(XrayImage.id == xray_id).first()
    if not xray:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tệp ảnh X-quang.")

    enc = xray.encounter
    if not enc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lượt khám liên kết.")
    verify_encounter_access(enc, current_user)

    # 1. Đọc dữ liệu ảnh gốc từ Cloudflare R2
    try:
        image_bytes = get_object_bytes_from_r2(xray.image_url)
    except Exception as e:
        logger.exception("Không đọc được tệp ảnh từ R2: %s", xray.image_url)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể truy xuất tệp ảnh X-quang từ R2: {str(e)}"
        )

    # 2. Gọi service segmentation-api trên Docker network
    ai_url = settings.SEGMENTATION_API_URL
    sep = "&" if "?" in ai_url else "?"
    ai_endpoint = f"{ai_url}{sep}include_images=true"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            filename = xray.original_filename or "xray.png"
            response = await client.post(
                ai_endpoint,
                files={"file": (filename, image_bytes, xray.content_type or "image/png")}
            )
    except httpx.TimeoutException:
        logger.error("AI service timeout sau 120 giây")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Máy chủ AI không phản hồi sau 120 giây (Timeout). Vui lòng thử lại."
        )
    except Exception as e:
        logger.exception("Không kết nối được dịch vụ AI nội bộ")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể kết nối đến AI Service: {str(e)}"
        )

    if response.status_code != 200:
        error_detail = response.text
        try:
            err_json = response.json()
            error_detail = err_json.get("detail", response.text)
        except Exception:
            pass
        logger.error("AI service trả lỗi HTTP %d: %s", response.status_code, error_detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Dịch vụ AI phân tích thất bại: {error_detail}"
        )

    ai_data = response.json()
    classification = ai_data.get("classification", {})
    if "error" in classification:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi phân loại AI: {classification['error']}"
        )

    # 3. Upload mask, crop và overlay lên Cloudflare R2
    xray_prefix = os.path.dirname(xray.image_url)
    mask_key = f"{xray_prefix}/mask.png"
    crop_key = f"{xray_prefix}/crop.png"
    overlay_key = f"{xray_prefix}/overlay.png"

    try:
        if "mask_base64" in ai_data and ai_data["mask_base64"]:
            upload_bytes_to_r2(base64.b64decode(ai_data["mask_base64"]), mask_key, "image/png")
        if "crop_base64" in ai_data and ai_data["crop_base64"]:
            upload_bytes_to_r2(base64.b64decode(ai_data["crop_base64"]), crop_key, "image/png")
        if "overlay_base64" in ai_data and ai_data["overlay_base64"]:
            upload_bytes_to_r2(base64.b64decode(ai_data["overlay_base64"]), overlay_key, "image/png")
    except Exception as e:
        logger.exception("Lỗi khi tải kết quả phân đoạn lên Cloudflare R2")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể lưu ảnh phân đoạn lên R2: {str(e)}"
        )

    # 4. Trích xuất 3 nhóm dự đoán và điểm tin cậy
    predictions = classification.get("predictions", [])
    flagged_names = [p["name"] for p in predictions if p.get("flagged")]
    if flagged_names:
        predicted_category = f"Cảnh báo: {', '.join(flagged_names)}"
    else:
        predicted_category = "Phổi bình thường (Âm tính theo ngưỡng)"

    max_prob = max([p.get("probability", 0.0) for p in predictions]) if predictions else float(ai_data.get("confidence", 0.0))

    seg_metadata = {
        "bbox": ai_data.get("bbox"),
        "lung_area_ratio": ai_data.get("lung_area_ratio"),
        "crop_shape": ai_data.get("crop_shape"),
        "timing_seconds": ai_data.get("timing_seconds")
    }

    # 5. Lưu vào CSDL
    existing_result = db.query(AIDiagnosticResult).filter(AIDiagnosticResult.xray_image_id == xray.id).first()
    if existing_result:
        existing_result.mask_image_url = mask_key
        existing_result.cropped_image_url = crop_key
        existing_result.overlay_image_url = overlay_key
        existing_result.predicted_category = predicted_category
        existing_result.confidence_score = max_prob
        existing_result.predictions_payload = classification
        existing_result.segmentation_metadata = seg_metadata
        existing_result.model_version = classification.get("model", "resnet18_crop")
        db.commit()
        db.refresh(existing_result)
        result_record = existing_result
    else:
        result_record = AIDiagnosticResult(
            xray_image_id=xray.id,
            mask_image_url=mask_key,
            cropped_image_url=crop_key,
            overlay_image_url=overlay_key,
            predicted_category=predicted_category,
            confidence_score=max_prob,
            predictions_payload=classification,
            segmentation_metadata=seg_metadata,
            model_version=classification.get("model", "resnet18_crop")
        )
        db.add(result_record)
        db.commit()
        db.refresh(result_record)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="RUN_AI_DIAGNOSIS",
        target_entity="ai_diagnostic_results",
        target_id=result_record.id,
        ip_address=get_client_ip(request),
        details={
            "predicted_category": result_record.predicted_category,
            "flagged_groups": flagged_names,
            "confidence_score": float(result_record.confidence_score)
        }
    )

    return {
        "id": result_record.id,
        "xray_image_id": result_record.xray_image_id,
        "mask_image_url": generate_presigned_url(result_record.mask_image_url),
        "cropped_image_url": generate_presigned_url(result_record.cropped_image_url),
        "overlay_image_url": generate_presigned_url(result_record.overlay_image_url),
        "predicted_category": result_record.predicted_category,
        "confidence_score": float(result_record.confidence_score),
        "predictions": predictions,
        "doctor_comment": result_record.doctor_comment,
        "created_at": result_record.created_at,
        "model_version": result_record.model_version,
        "timing_seconds": seg_metadata.get("timing_seconds")
    }

@router.put("/ai-results/{result_id}/comment", response_model=AIDiagnosticResultResponse)
def update_doctor_comment(
    result_id: int,
    body: DoctorCommentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DOCTOR", "ADMIN"]))
):
    """UC007: Bác sĩ xem xét, ghi nhận xét và xác nhận kết quả gợi ý của AI vào hồ sơ"""
    res = db.query(AIDiagnosticResult).filter(AIDiagnosticResult.id == result_id).first()
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả AI.")
    verify_encounter_access(res.xray_image.encounter, current_user)

    res.doctor_comment = body.doctor_comment.strip()
    db.commit()
    db.refresh(res)

    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CONFIRM_AI_RESULT",
        target_entity="ai_diagnostic_results",
        target_id=res.id,
        ip_address=get_client_ip(request),
        details={"doctor_comment": res.doctor_comment}
    )

    preds = []
    if res.predictions_payload and isinstance(res.predictions_payload, dict):
        preds = res.predictions_payload.get("predictions", [])

    return {
        "id": res.id,
        "xray_image_id": res.xray_image_id,
        "mask_image_url": generate_presigned_url(res.mask_image_url),
        "cropped_image_url": generate_presigned_url(res.cropped_image_url),
        "overlay_image_url": generate_presigned_url(res.overlay_image_url),
        "predicted_category": res.predicted_category,
        "confidence_score": float(res.confidence_score) if res.confidence_score is not None else 0.0,
        "predictions": preds,
        "doctor_comment": res.doctor_comment,
        "created_at": res.created_at,
        "model_version": res.model_version,
        "timing_seconds": res.segmentation_metadata.get("timing_seconds") if res.segmentation_metadata else None
    }
