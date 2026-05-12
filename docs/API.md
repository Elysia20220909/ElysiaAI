# 📡 ElysiaAI: API Specification (v1.3.0)

ElysiaAI provides a modular REST API for interacting with the sovereign intelligence kernel and managing the system.

---

## 🛡️ Authentication

Browser clients authenticate with HttpOnly cookies issued by `/auth/token`.
Legacy service clients may still send an access token with `Authorization`.

**Cookie Format:**
```http
Cookie: elysia_access_token=<jwt>; elysia_refresh_token=<jwt>; elysia_csrf_token=<csrf>
```

**CSRF Header for unsafe cookie requests:**
```http
x-csrf-token: <value from elysia_csrf_token cookie or auth response>
```

**Legacy Header Format:**
```http
Authorization: Bearer <your_jwt_token>
```

---

## 🔑 1. Auth Endpoints

### POST `/auth/register`
Register a new user.
- **Body**: `{ "username": "...", "password": "..." }`
- **Constraint**: Password min length 8.
- **Response (201 Created)**:
  ```json
  { "message": "User registered successfully", "userId": "uuid-v4" }
  ```
- **Example**:
  ```bash
  curl -X POST http://localhost:3000/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"elysia","password":"strong-password"}'
  ```

### POST `/auth/token`
Create a session. Access and refresh JWTs are stored as HttpOnly cookies.
- **Body**: `{ "username": "...", "password": "..." }`
- **Returns (200 OK)**:
  ```json
  {
    "authenticated": true,
    "tokenType": "Bearer",
    "transport": "httpOnly-cookie",
    "expiresIn": 900,
    "username": "elysia",
    "role": "admin",
    "csrfToken": "csrf-token"
  }
  ```
- **Example**:
  ```bash
  curl -i -c cookies.txt -X POST http://localhost:3000/auth/token \
    -H "Content-Type: application/json" \
    -d '{"username":"elysia","password":"strong-password"}'
  ```

### POST `/auth/refresh`
Rotate the refresh token and issue a fresh access cookie.
- **Body**: optional `{ "refreshToken": "..." }` for legacy clients.
- **Cookie clients**: send `elysia_refresh_token` and `x-csrf-token`.
- **Response (200 OK)**:
  ```json
  {
    "authenticated": true,
    "tokenType": "Bearer",
    "transport": "httpOnly-cookie",
    "expiresIn": 900,
    "csrfToken": "new-csrf-token"
  }
  ```

### POST `/auth/logout`
Revoke the refresh token when present and clear auth cookies.
- **Cookie clients**: send `x-csrf-token`.
- **Response (200 OK)**:
  ```json
  { "message": "Logged out successfully" }
  ```

### GET `/auth/session`
Return the current cookie or bearer session without exposing JWTs.
- **Response (200 OK)**:
  ```json
  {
    "authenticated": true,
    "transport": "httpOnly-cookie",
    "user": { "id": "user-id", "username": "elysia", "role": "admin" },
    "expiresAt": "2026-05-10T12:34:56.000Z"
  }
  ```

---

## 🧠 2. Intelligence Endpoints

### POST `/api/process`
Primary interface for synchronous AI interaction (Resonance Loop).
- **Body**: `{ "query": "..." }`
- **Returns (200 OK)**:
  ```json
  {
    "response": "AI processing result...",
    "context": ["Source 1", "Source 2"],
    "thoughts": ["The model's internal reasoning process..."]
  }
  ```
- **Example**:
  ```bash
  curl -X POST http://localhost:3000/api/process \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <accessToken>" \
    -d '{"query":"Who are you?"}'
  ```

### POST `/elysia-love`
Direct chat interface for expressive and emotional interactions.
- **Body**: `{ "messages": [...], "mode": "sweet|normal|professional" }`

### POST `/feedback`
Submit user feedback for AI responses to improve future resonance and training.
- **Body**: `{ "query": "...", "answer": "...", "rating": 1-5, "reason": "..." }`
- **Response (200 OK)**:
  ```json
  { "status": "success", "message": "Feedback received" }
  ```

---

## 🛡️ 3. Administration (Admin/Owner Role Required)

> [!IMPORTANT]
> Access to these endpoints requires a JWT with `role: admin` or `role: owner`.

### GET `/admin/analytics`
Export system analytics in JSON format for external monitoring.
- **Example**:
  ```bash
  curl http://localhost:3000/admin/analytics \
    -H "Authorization: Bearer <accessToken>"
  ```

### GET `/admin/api-keys`
List active API keys and their associated usage statistics.

### POST `/admin/backups/trigger`
Manually trigger an encrypted system backup process.

### GET `/admin/health-monitor`
Retrieve detailed health status, latency, and resource usage of all internal services (Kernel, DB, Milvus).

---

## ⚙️ 4. System Endpoints

### GET `/health`
Basic service health check. Returns `200 OK` if the Bun server is alive.

### GET `/metrics`
Prometheus-formatted system metrics for monitoring and alerting.
- **Response Example**:
  ```text
  # HELP http_requests_total Total number of HTTP requests
  # TYPE http_requests_total counter
  http_requests_total{method="GET",path="/health",status="200"} 42
  ```

---

## ❌ Error Codes

Errors use a stable JSON envelope:

```json
{
  "error": "CSRF token mismatch",
  "code": "CSRF_TOKEN_INVALID",
  "status": 403,
  "timestamp": "2026-05-10T12:34:56.000Z"
}
```

| Code | Description |
| :--- | :--- |
| **400 Bad Request** | Invalid request parameters or malformed JSON. |
| **401 Unauthorized** | Missing or invalid authentication token. |
| **403 Forbidden** | Insufficient permissions or invalid CSRF token. |
| **404 Not Found** | The requested resource or endpoint does not exist. |
| **429 Too Many Requests** | Rate limit exceeded. |
| **500 Internal Error** | An unexpected error occurred within the AI Kernel or Server. |

---
© 2026 Elysia20220909 // ElysiaAI Main
