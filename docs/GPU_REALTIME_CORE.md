# ElysiaAI GPU Realtime Core

## Overview

ElysiaAI now includes a realtime GPU inference layer.

Architecture:

```text
Tauri HUD
   ↓
WebSocket /gpu/stream
   ↓
Bun / Elysia
   ↓
FastAPI GPU Kernel
   ↓
CUDA / RTX
```

---

## Start GPU Kernel

```bash
cd python/gpu_infer
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8787
```

---

## Start ElysiaAI

```bash
bun run dev
```

---

## HTTP Endpoints

### GPU Status

```http
GET /gpu/status
```

### GPU Infer

```http
POST /gpu/infer
Content-Type: application/json

{
  "text": "Elysia wake up"
}
```

---

## WebSocket

### Connect

```text
ws://127.0.0.1:3000/gpu/stream
```

---

### Ping

```json
{
  "type": "ping"
}
```

---

### Status

```json
{
  "type": "status"
}
```

---

### Infer

```json
{
  "type": "infer",
  "text": "Realtime inference request"
}
```

---

## Example Response

```json
{
  "type": "result",
  "data": {
    "input": "Realtime inference request",
    "device": "cuda",
    "gpu_ready": true,
    "latency_ms": 1.82,
    "score": 0.123
  }
}
```

---

## Future Phases

- ONNX Runtime integration
- TensorRT acceleration
- Sensor fusion
- Tauri overlay HUD
- Distributed edge inference
- Streaming telemetry memory
