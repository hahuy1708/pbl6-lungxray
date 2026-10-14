import base64

import cv2
from fastapi import FastAPI, UploadFile, HTTPException
from app.segmentation import SegmentationModel

app = FastAPI()

# Khởi tạo model 1 lần duy nhất khi ứng dụng bắt đầu
seg_model = SegmentationModel("weights/unet_best.pth")

@app.post("/segment")
async def segment_xray(file: UploadFile):
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
        "warning": result.warning
    }


@app.post("/segment/crops")
async def segment_crops(file: UploadFile):
    result = seg_model.predict(await file.read())

    if not result.is_valid:
        raise HTTPException(status_code=422, detail=result.warning or "Ảnh không hợp lệ")

    images = {}
    for name, image in (("crop", result.crop), ("crop_masked", result.crop_masked)):
        ok, buffer = cv2.imencode(".png", image)
        if not ok:
            raise HTTPException(status_code=500, detail=f"Không mã hóa được ảnh {name}")
        images[name] = base64.b64encode(buffer).decode("ascii")

    return {
        "confidence": round(result.confidence, 4),
        "lung_area_ratio": round(result.lung_area_ratio, 4),
        "bbox": {"x0": result.bbox[0], "y0": result.bbox[1],
                 "x1": result.bbox[2], "y1": result.bbox[3]},
        "crop_shape": list(result.crop.shape),
        "crop_masked_shape": list(result.crop_masked.shape),
        "crop_png_base64": images["crop"],
        "crop_masked_png_base64": images["crop_masked"],
    }
