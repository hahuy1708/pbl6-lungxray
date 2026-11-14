import base64
import logging
import time

import cv2
import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile, Query

from app.segmentation import SegmentationModel, to_gray_uint8


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("segmentation-api")

app = FastAPI(title="Segmentation API")
seg_model = SegmentationModel("weights/unet_best.pth")
CLASSIFICATION_API_URL = "http://classification-api:8000/predict"


async def _classify_crop(crop) -> dict:
    """Send the full-resolution lung crop directly over the Docker network."""
    ok, buffer = cv2.imencode(".png", crop)
    if not ok:
        raise HTTPException(status_code=500, detail="Không mã hóa được ảnh crop")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                CLASSIFICATION_API_URL,
                files={"file": ("lung-crop.png", buffer.tobytes(), "image/png")},
            )
    except httpx.RequestError as exc:
        logger.exception("Không kết nối được Classification API")
        return {"error": f"Không kết nối được Classification API: {exc}"}

    try:
        payload = response.json()
    except ValueError:
        payload = {"detail": response.text[:500]}

    if not response.is_success:
        return {"error": payload.get("detail", f"HTTP {response.status_code}")}
    return payload


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/segment")
async def segment_xray(file: UploadFile = File(...)):
    contents = await file.read()
    result = seg_model.predict(contents)

    if not result.is_valid:
        raise HTTPException(status_code=422, detail=result.warning or "Ảnh không hợp lệ")

    return {
        "is_valid": result.is_valid,
        "confidence": round(result.confidence, 4),
        "lung_area_ratio": round(result.lung_area_ratio, 4),
        "bbox": {
            "x0": result.bbox[0],
            "y0": result.bbox[1],
            "x1": result.bbox[2],
            "y1": result.bbox[3],
        },
        "mask_shape": list(result.mask.shape),
        "crop_shape": list(result.crop.shape),
        "warning": result.warning,
    }


@app.post("/segment/crops")
async def segment_crops(file: UploadFile = File(...), include_images: bool = Query(False)):
    """Run both models; optionally return base64 artifacts for backend/R2 storage."""
    started = time.perf_counter()
    contents = await file.read()

    segmentation_started = time.perf_counter()
    result = seg_model.predict(contents)
    segmentation_seconds = time.perf_counter() - segmentation_started

    if not result.is_valid:
        raise HTTPException(status_code=422, detail=result.warning or "Ảnh không hợp lệ")

    classification_started = time.perf_counter()
    classification = await _classify_crop(result.crop)
    classification_seconds = time.perf_counter() - classification_started
    total_seconds = time.perf_counter() - started

    if isinstance(classification, dict) and "error" in classification:
        raise HTTPException(
            status_code=502,
            detail=f"Dịch vụ phân loại AI gặp sự cố: {classification['error']}"
        )

    logger.info(
        "file=%s upload_bytes=%d segmentation=%.3fs classification=%.3fs total=%.3fs",
        file.filename,
        len(contents),
        segmentation_seconds,
        classification_seconds,
        total_seconds,
    )

    payload = {
        "confidence": round(result.confidence, 4),
        "lung_area_ratio": round(result.lung_area_ratio, 4),
        "bbox": {
            "x0": result.bbox[0],
            "y0": result.bbox[1],
            "x1": result.bbox[2],
            "y1": result.bbox[3],
        },
        "crop_shape": list(result.crop.shape),
        "classification": classification,
        "timing_seconds": {
            "segmentation": round(segmentation_seconds, 3),
            "classification": round(classification_seconds, 3),
            "total_server": round(total_seconds, 3),
        },
    }

    if include_images:
        # 1. Mask (uint8 0/255)
        mask_uint8 = (result.mask * 255).astype("uint8")
        ok_m, buf_m = cv2.imencode(".png", mask_uint8)
        payload["mask_base64"] = base64.b64encode(buf_m.tobytes()).decode("ascii") if ok_m else None

        # 2. Crop
        ok_c, buf_c = cv2.imencode(".png", result.crop)
        payload["crop_base64"] = base64.b64encode(buf_c.tobytes()).decode("ascii") if ok_c else None

        # 3. Overlay (green contour + red bbox)
        try:
            gray = to_gray_uint8(contents)
            overlay = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            cnts, _ = cv2.findContours(result.mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(overlay, cnts, -1, (0, 255, 0), 2)
            x0, y0, x1, y1 = result.bbox
            cv2.rectangle(overlay, (x0, y0), (x1, y1), (0, 0, 255), 2)
            ok_o, buf_o = cv2.imencode(".png", overlay)
            payload["overlay_base64"] = base64.b64encode(buf_o.tobytes()).decode("ascii") if ok_o else None
        except Exception as exc:
            logger.warning("Không tạo được overlay image: %s", exc)
            payload["overlay_base64"] = None

    return payload
