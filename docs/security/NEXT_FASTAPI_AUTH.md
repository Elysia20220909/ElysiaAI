# Next.js + FastAPI Auth

要約: FastAPI が access token と refresh token を HttpOnly Cookie として発行し、Next.js は同一オリジンの `/api/*` 経由で認証 API を呼びます。CSRF は readable cookie と `x-csrf-token` ヘッダーの double-submit 方式で扱います。

## Backend

- 実装: `python/lib/auth_session.py`
- 接続: `python/fastapi_server.py`
- JWT:
  - access token: 15分、`elysia_access_token`、HttpOnly。
  - refresh token: 7日、`elysia_refresh_token`、HttpOnly、refresh 時にローテーション。
- CSRF:
  - `elysia_csrf_token` は JavaScript から読める Cookie。
  - Cookie 認証の `POST` / `PUT` / `PATCH` / `DELETE` は `x-csrf-token` 必須。
- 認証情報:
  - 既定では `AUTH_USERNAME` / `AUTH_PASSWORD` を検証。
  - `JWT_SECRET` / `JWT_REFRESH_SECRET` は本番で必ず強い値に変更。
- Cookie:
  - `SameSite=lax`
  - `AUTH_COOKIE_SECURE=true` で `Secure` を強制。
  - HTTPS またはリバースプロキシ配下では `x-forwarded-proto: https` を尊重。

## Frontend

- 実装: `apps/web`
- API クライアント: `apps/web/lib/auth-api.ts`
- Login UI: `apps/web/app/login/LoginForm.tsx`
- Dashboard session check: `apps/web/app/dashboard/DashboardClient.tsx`
- Next.js rewrite:
  - Browser: `/api/auth/token`
  - FastAPI: `/auth/token`
- token は `localStorage` に保存しません。
- unsafe method では `elysia_csrf_token` を読み、`x-csrf-token` を付けます。
- `401` を受けた protected request は `/api/auth/refresh` を一度だけ試し、その後に元リクエストを再実行します。

## API仕様

| Method | Path | Purpose | CSRF |
| --- | --- | --- | --- |
| `POST` | `/auth/token` | credentials を検証し Cookie session を作成 | 不要 |
| `POST` | `/auth/refresh` | refresh token をローテーションし access token を再発行 | Cookie 利用時は必須 |
| `POST` | `/auth/logout` | refresh token を revoke し Cookie を削除 | Cookie 利用時は必須 |
| `GET` | `/auth/session` | 現在の session を返す | 不要 |

### POST `/auth/token`

Request:

```json
{
  "username": "admin",
  "password": "correct-password"
}
```

Response:

```json
{
  "authenticated": true,
  "tokenType": "Bearer",
  "transport": "httpOnly-cookie",
  "expiresIn": 900,
  "username": "admin",
  "role": "admin",
  "csrfToken": "csrf-token"
}
```

### GET `/auth/session`

Response:

```json
{
  "authenticated": true,
  "transport": "httpOnly-cookie",
  "user": {
    "id": "local-admin",
    "username": "admin",
    "role": "admin"
  },
  "expiresAt": "2026-05-10T12:34:56Z"
}
```

## エラーハンドリング

すべての認証エラーは安定した JSON envelope を返します。

```json
{
  "error": "CSRF token mismatch",
  "code": "CSRF_TOKEN_INVALID",
  "status": 403,
  "timestamp": "2026-05-10T12:34:56Z"
}
```

| Code | Status | Meaning |
| --- | ---: | --- |
| `AUTH_INVALID_CREDENTIALS` | 401 | ユーザー名またはパスワードが不正 |
| `AUTH_REQUIRED` | 401 | access token がない |
| `AUTH_TOKEN_INVALID` | 401 | access token が不正または期限切れ |
| `AUTH_REFRESH_REQUIRED` | 401 | refresh token がない |
| `AUTH_REFRESH_INVALID` | 401 | refresh token が不正、期限切れ、または revoke 済み |
| `CSRF_TOKEN_INVALID` | 403 | CSRF cookie と header が一致しない |

## Local Run

FastAPI:

```powershell
.venv/Scripts/python.exe -m uvicorn python.fastapi_server:app --reload --host 127.0.0.1 --port 8000
```

Next.js:

```powershell
cd apps/web
bun install
bun run dev
```

Production notes:

- `JWT_SECRET` と `JWT_REFRESH_SECRET` は32文字以上のランダム値にする。
- HTTPS 配下では `AUTH_COOKIE_SECURE=true` を設定する。
- Next.js と FastAPI を別ドメインにする場合は CORS の `allow_origins` と Cookie の SameSite/Secure 設計を見直す。
