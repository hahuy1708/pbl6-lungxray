from fastapi import FastAPI

app = FastAPI(title="Classification API")

@app.get("/")
def root():
    return {"service": "classification-api", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}