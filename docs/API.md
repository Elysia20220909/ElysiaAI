# 藤 ElysiaAI: API Specification (v1.3.0)

ElysiaAI provides a modular REST API for interacting with the sovereign intelligence kernel and managing the system.

---

## 孱・・Authentication

All API requests (except `/auth/*` and `/health`) require a JWT token in the `Authorization` header.

**Header Format:**
```http
Authorization: Bearer <your_jwt_token>
```

---

## 泊 1. Auth Endpoints

### POST `/auth/register`
Register a new user.
- **Body**: `{ "username": "...", "password": "..." }`
- **Constraint**: Password min length 8.
- **Response (201 Created)**:
  ```json
  { "message": "User registered successfully", "userId": "uuid-v4" }
  ```

### POST `/auth/token`
Obtain access and refresh tokens.
- **Body**: `{ "username": "...", "password": "..." }`
- **Returns (200 OK)**:
  ```json
  { "accessToken": "...", "refreshToken": "..." }
  ```

### POST `/auth/refresh`
Refresh an expired access token using a refresh token.
- **Body**: `{ "refreshToken": "..." }`

---

## ｧ 2. Intelligence Endpoints

### POST `/api/process`
Primary interface for synchronous AI interaction (Resonance Loop).
- **Body**: `{ "query": "..." }`
- **Returns (200 OK)**:
  ```json
  {
    "response": "AI processing result...",
    "context": ["Source 1", "Source 2"],
    "thoughts": "The model's internal reasoning process..."
  }
  ```

### POST `/elysia-love`
Direct chat interface for expressive and emotional interactions.
- **Body**: `{ "messages": [...], "mode": "sweet|normal|professional" }`

### POST `/feedback`
Submit user feedback for AI responses to improve future resonance and training.
- **Body**: `{ "query": "...", "answer": "...", "rating": 1-5, "reason": "..." }`

---

## 孱・・3. Administration (Admin/Owner Role Required)

> [!IMPORTANT]
> Access to these endpoints requires a JWT with `role: admin` or `role: owner`.

### GET `/admin/analytics`
Export system analytics in JSON format for external monitoring.

### GET `/admin/api-keys`
List active API keys and their associated usage statistics.

### POST `/admin/backups/trigger`
Manually trigger an encrypted system backup process.

### GET `/admin/health-monitor`
Retrieve detailed health status, latency, and resource usage of all internal services (Kernel, DB, Milvus).

---

## 笞呻ｸ・4. System Endpoints

### GET `/health`
Basic service health check. Returns `200 OK` if the Bun server is alive.

### GET `/metrics`
Prometheus-formatted system metrics for monitoring and alerting.

---

## 笶・Error Codes

| Code | Description |
| :--- | :--- |
| **400 Bad Request** | Invalid request parameters or malformed JSON. |
| **401 Unauthorized** | Missing or invalid authentication token. |
| **403 Forbidden** | Insufficient permissions (requires Admin/Owner role). |
| **404 Not Found** | The requested resource or endpoint does not exist. |
| **429 Too Many Requests** | Rate limit exceeded. |
| **500 Internal Error** | An unexpected error occurred within the AI Kernel or Server. |

---
ﾂｩ 2026 Elysia20220909 // ElysiaAI Main
