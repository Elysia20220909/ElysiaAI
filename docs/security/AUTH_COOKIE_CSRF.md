# Auth Cookie and CSRF Design

Summary: ElysiaAI uses short-lived access tokens and rotating refresh tokens, both stored in HttpOnly cookies for browser clients. Unsafe cookie-authenticated requests must include a double-submit CSRF header.

## Backend

- `packages/server/src/lib/auth-cookies.ts` owns cookie parsing, cookie serialization, JWT verification, refresh-cookie resolution, and CSRF validation.
- `/auth/token` verifies credentials and sets:
  - `elysia_access_token`: HttpOnly, SameSite=Lax, short lived.
  - `elysia_refresh_token`: HttpOnly, SameSite=Lax, rotating.
  - `elysia_csrf_token`: readable SameSite=Lax CSRF token.
- `/auth/refresh` rotates the refresh token and writes a new cookie set.
- `/auth/logout` revokes the refresh token when present and clears all auth cookies.
- Protected routes call shared helpers instead of verifying JWTs inline.
- Legacy `Authorization: Bearer <token>` remains supported for scripts and service clients.

## Frontend

- `public/standalone/login/app.ts` is the strict TypeScript source for the login flow.
- `public/standalone/login/app.js` is the browser script served by the static page.
- The login UI no longer stores access or refresh tokens in `localStorage`.
- Browser requests use `credentials: "same-origin"` so HttpOnly cookies are sent by the browser.
- Unsafe requests add `x-csrf-token` from the readable CSRF cookie.
- Non-secret local preferences, such as the last chat username, may remain in `localStorage`.

## API仕様

| Endpoint | Purpose | Auth/CSRF |
| --- | --- | --- |
| `POST /auth/token` | Login and issue cookies | No prior CSRF required |
| `POST /auth/refresh` | Rotate refresh token | CSRF required when refresh comes from cookie |
| `POST /auth/logout` | Revoke refresh and clear cookies | CSRF required when refresh comes from cookie |
| `GET /auth/session` | Check current session | Cookie or bearer, no CSRF |
| Protected `GET` routes | Read authenticated data | Cookie or bearer, no CSRF |
| Protected `POST/PUT/PATCH/DELETE` routes | Mutate authenticated data | CSRF required when auth comes from cookie |

The auth response body intentionally avoids echoing JWTs:

```json
{
  "authenticated": true,
  "tokenType": "Bearer",
  "transport": "httpOnly-cookie",
  "expiresIn": 900,
  "csrfToken": "csrf-token"
}
```

## エラーハンドリング

- `AUTH_REQUIRED`: access token was not found in bearer header or cookie.
- `AUTH_TOKEN_INVALID`: access token is invalid or expired.
- `AUTH_REFRESH_REQUIRED`: refresh token was not found in body or cookie.
- `AUTH_REFRESH_INVALID`: refresh token is expired, revoked, or not persisted.
- `CSRF_TOKEN_INVALID`: cookie-authenticated unsafe request did not include a matching `x-csrf-token`.
- `AUTH_FORBIDDEN`: authenticated user lacks the required role.

Error responses share the same envelope:

```json
{
  "error": "CSRF token mismatch",
  "code": "CSRF_TOKEN_INVALID",
  "status": 403,
  "timestamp": "2026-05-10T12:34:56.000Z"
}
```
