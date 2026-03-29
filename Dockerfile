FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency resolution
RUN pip install uv

# Copy Python backend files
COPY python/pyproject.toml python/README.md ./
# Install dependencies into system environment so Docker doesn't need venv
RUN uv pip install --system -e ".[dev]"

# Copy application source
COPY python/ ./

EXPOSE 8000

# Start Elysia API Server
CMD ["uvicorn", "fastapi_server:app", "--host", "0.0.0.0", "--port", "8000"]
