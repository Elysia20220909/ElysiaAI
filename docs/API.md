# 📡 ElysiaAI: API Specification (v1.3.0)

ElysiaAI provides a modular REST API for interacting with the sovereign intelligence kernel and managing the system.

## 🔑 Authentication

### POST `/auth/register`
Register a new user.
- **Body**: `{ "username": "...", "password": "..." }`
- **Constraint**: Password min length 8.

### POST `/auth/token`
Obtain access and refresh tokens.
- **Body**: `{ "username": "...", "password": "..." }`
- **Returns**: `{ "accessToken": "...", "refreshToken": "..." }`

### POST `/auth/refresh`
Refresh an expired access token.
- **Body**: `{ "refreshToken": "..." }`

---

## 🧠 Intelligence

### POST `/api/process`
Primary interface for synchronous AI interaction (Resonance Loop).
- **Body**: `{ "query": "..." }`
- **Returns**: AI response with retrieved context and thoughts.

### POST `/elysia-love`
Direct chat interface for expressive interactions.
- **Body**: `{ "messages": [...], "mode": "sweet|normal|professional" }`

### POST `/feedback`
Submit user feedback for AI responses to improve future resonance.
- **Body**: `{ "query": "...", "answer": "...", "rating": "1-5", "reason": "..." }`

---

## 🛡️ Administration (Admin/Owner Role Required)

### GET `/admin/analytics`
Export system analytics in JSON format.

### GET `/admin/api-keys`
List active API keys and usage statistics.

### POST `/admin/backups/trigger`
Manually trigger a system backup.

### GET `/admin/health-monitor`
Retrieve detailed health status of all internal services.

---

## ⚙️ System

### GET `/health`
Basic service health check.

### GET `/metrics`
Prometheus-formatted system metrics.

---
© 2026 Elysia20220909 // ElysiaAI Main
