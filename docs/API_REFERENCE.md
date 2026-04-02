# 🌸 Elysia OS - API Reference (Resonance v2.1)

This document provides a comprehensive guide to the Elysia OS AI Kernel's REST APIs.

## Base URL
The default kernel runs at: `http://localhost:8000`

## Authentication
Most endpoints require an API Key passed in the header:
`x-api-key: ELYSIATEST-001`

---

## 1. Chat & Perception
### `POST /chat`
The main interactive endpoint. Integrates session state, active perception (sensors), and long-term memory.

**Request Body:**
```json
{
  "messages": [{"role": "user", "content": "Hello!"}],
  "session_id": "user_01",
  "stream": true
}
```

**Stream Response (SSE):**
Returns JSON chunks containing `content`, `emotion`, and `portrait_url`.

---

## 2. Real-time Telemetry
### `GET /system/monitor`
Fetches the current state of the OS hardware and AI session heartbeats.

**Response Schema:**
- `timestamp`: Server time string.
- `system`: Hardware metrics (CPU/RAM/Uptime).
- `elysia`: Active session counts and top-level persona states.

---

## 3. Runner Memory (Vault)
### `POST /memory/add`
Manually inject a memory block into the AI's long-term vector vault.

**Payload:**
- `session_id`: Unique identifier for the user relationship.
- `role`: "user" or "assistant".
- `content`: Memory text.
- `emotion`: Affective tag.

### `POST /rag`
A direct search endpoint for the memory vault and baseline quotes.

---

## 4. Maintenance & Diagnostics
### `GET /health`
Returns system health, database connectivity, and baseline quote count.

### `GET /system/stats`
Legacy lightweight system telemetry.
