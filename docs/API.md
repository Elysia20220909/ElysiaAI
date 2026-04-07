# API Documentation

## Base URL

```text
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```text
Authorization: Bearer <access_token>
```

### Get Access Token

```http
POST /auth/token
Content-Type: application/json

{
  "username": "elysia",
  "password": "your-password"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```http
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Chat Endpoints

### Send Chat Message

```http
POST /elysia-love
Content-Type: application/json

{
  "message": "こんにちは、エリシアちゃん",
  "userName": "ユーザー名"
}
```

**Response:** Server-Sent Events (SSE) stream

```text
data: {"chunk": "こんにちは"}
data: {"chunk": "！"}
data: {"chunk": "元気"}
data: {"done": true}
```

## Feedback Endpoints

### Submit Feedback

🔒 Requires Authentication

```http
POST /feedback
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "query": "質問内容",
  "answer": "回答内容",
  "rating": "up",
  "reason": "とても役に立ちました"
}
```

**Parameters:**

- `query` (string, required): Original user query
- `answer` (string, required): AI's answer
- `rating` (string, required): "up" or "down"
- `reason` (string, optional): Feedback reason

**Response:**

```json
{
  "ok": true,
  "saved": true
}
```

## Knowledge Management

### Add Knowledge

🔒 Requires Authentication

```http
POST /knowledge/upsert
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "summary": "新しい知識の要約",
  "sourceUrl": "https://example.com/source",
  "tags": ["AI", "機械学習"],
  "confidence": 0.95
}
```

**Parameters:**

- `summary` (string, required): Knowledge summary
- `sourceUrl` (string, optional): Source URL
- `tags` (array, optional): Tags for categorization
- `confidence` (number, optional): Confidence score (0-1)

**Response:**

```json
{
  "ok": true,
  "saved": true
}
```

### Review Knowledge

🔒 Requires Authentication

```http
GET /knowledge/review?n=20
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `n` (number, optional): Number of recent entries to retrieve (default: 20, max: 100)

**Response:**

```json
{
  "entries": [
    {
      "timestamp": "2025-12-03T10:30:00.000Z",
      "summary": "知識の要約",
      "sourceUrl": "https://example.com",
      "tags": ["AI"],
      "confidence": 0.95
    }
  ],
  "count": 1
}
```

## Voice Logs

### Get Voice Logs

```http
GET /voice-logs?n=10
```

**Query Parameters:**

- `n` (number, optional): Number of recent logs (default: 10, max: 100)

**Response:**

```json
{
  "logs": [
    {
      "timestamp": "2025-12-03T10:30:00.000Z",
      "text": "こんにちは！",
      "emotion": "joy"
    }
  ]
}
```

## Health Check

### Check Service Health

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-03T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "redis": "connected",
    "fastapi": "ok",
    "ollama": "ok",
    "milvus": "lite (data/elysia_brain.db)"
  }
}
```

## AI Kernel Skills (Resonance v2.6)

The Python kernel implements the following skills available via `<skill:name(...)>` tags in AI responses:

| Skill | Parameters | Description |
| ----- | ---------- | ----------- |
| `search_docs` | `query` | **(NEW)** Semantic search across the `docs/` directory using Milvus Lite & Vector Embeddings. |
| `python_exec` | `code` | Executes Python code in a soft sandbox on the kernel. |
| `memorize` | `key`, `value` | Persists a fact to the kernel's long-term memory vault. |
| `delegate` | `agent`, `query` | Delegates the query to a specialized agent (security, debugger, writer). |

## Vector RAG Architecture

The RAG system in Phase 6 has been upgraded from TF-IDF to **Semantic Vector Search**:

1. **Embedding Model**: `all-MiniLM-L6-v2` via Sentence-Transformers.
2. **Vector DB**: `Milvus Lite` (locally stored in `data/elysia_brain.db`).
3. **Indexing**: Automated indexing of all `.md` files in the repository's `docs/` folder.

## Metrics

### Get Prometheus Metrics

```http
GET /metrics
```

**Response:** Prometheus format metrics

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",path="/elysia-love",status="200"} 1234

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": "Missing required field: message"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limits

| Endpoint            | Limit       | Window      |
| ------------------- | ----------- | ----------- |
| `/elysia-love`      | 20 requests | 60 seconds  |
| `/feedback`         | 10 requests | 60 seconds  |
| `/knowledge/upsert` | 30 requests | 60 seconds  |
| `/auth/token`       | 5 requests  | 300 seconds |

## Webhooks

### Alert Webhook

Receives alerts from Prometheus Alertmanager:

```http
POST /webhooks/alerts
Content-Type: application/json

{
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighErrorRate",
        "severity": "critical"
      },
      "annotations": {
        "summary": "High error rate detected"
      }
    }
  ]
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Authentication
const response = await fetch("http://localhost:3000/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "elysia",
    password: "your-password",
  }),
});
const { accessToken } = await response.json();

// Chat with SSE
const eventSource = new EventSource("http://localhost:3000/elysia-love?" + new URLSearchParams({ message: "Hello", userName: "User" }));

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.done) {
    eventSource.close();
  } else {
    console.log(data.chunk);
  }
};

// Submit feedback
await fetch("http://localhost:3000/feedback", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    query: "test query",
    answer: "test answer",
    rating: "up",
  }),
});
```

### Python

```python
import requests

# Authentication
response = requests.post('http://localhost:3000/auth/token', json={
    'username': 'elysia',
    'password': 'your-password'
})
access_token = response.json()['accessToken']

# Submit feedback
response = requests.post(
    'http://localhost:3000/feedback',
    headers={'Authorization': f'Bearer {access_token}'},
    json={
        'query': 'test query',
        'answer': 'test answer',
        'rating': 'up'
    }
)
print(response.json())
```

## WebSocket Support

WebSocket support has been integrated in Phase 5 via the WebSocketManager (`src/lib/websocket-manager.ts`).
Real-time communication is available for chat notifications, dashboard updates, and room-based broadcasting.
For simpler use cases, Server-Sent Events (SSE) are still available.
