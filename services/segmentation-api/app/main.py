from fastapi import FastAPI

app = FastAPI(title="Segmentation API")

@app.get("/")
def root():
    return {"service": "segmentation-api", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}