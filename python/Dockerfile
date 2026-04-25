FROM python:3.12-slim-bookworm

WORKDIR /app

# Runtime deps for FastAPI and native Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 依存ファイルのみ先にコピーし、キャッシュを活用
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# データベース（SQLite）の永続化パス設定
RUN mkdir -p /app/data
ENV ELYSIA_MEMORY_DB=/app/data/historical.db

# アプリ本体をコピー
COPY . .
ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "python.fastapi_server:app", "--host", "0.0.0.0", "--port", "8000"]
