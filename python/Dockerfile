FROM python:3.11-slim

WORKDIR /app
# 依存ファイルのみ先にコピーし、キャッシュを活用
COPY requirements.txt .
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt
# アプリ本体をコピー
COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "fastapi_server:app", "--host", "0.0.0.0", "--port", "8000"]
