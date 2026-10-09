# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# PyTorch is the largest dependency; use only its CPU wheel index and cache it
# across builds. Keep the rest of pip on the default PyPI index.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch==2.5.1+cpu \
      --index-url https://pypi.org/simple \
      --extra-index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
