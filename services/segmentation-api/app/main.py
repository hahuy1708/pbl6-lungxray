import logging
import time

import cv2
import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile

from app.segmentation import SegmentationModel


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
async def segment_crops(file: UploadFile = File(...)):
    """Run both models; return metadata only, never transfer crop images to the browser."""
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

    logger.info(
        "file=%s upload_bytes=%d segmentation=%.3fs classification=%.3fs total=%.3fs",
        file.filename,
        len(contents),
        segmentation_seconds,
        classification_seconds,
        total_seconds,
    )

    return {
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
