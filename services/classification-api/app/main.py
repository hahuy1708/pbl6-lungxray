from fastapi import FastAPI, File, HTTPException, UploadFile

from app.classifier import LungFindingClassifier

app = FastAPI(title="Classification API")
classifier = LungFindingClassifier("weights/resnet18_crop_best.pth")

@app.get("/")
def root():
    return {"service": "classification-api", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Classify a grayscale lung crop produced by the segmentation service."""
    image_bytes = await file.read()
    try:
        return classifier.predict(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
