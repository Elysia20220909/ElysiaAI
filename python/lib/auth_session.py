from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import inspect
import json
import os
import secrets
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field


TokenSource = Literal["authorization", "cookie"]
RefreshTokenSource = Literal["body", "cookie"]
CredentialVerifier = Callable[[str, str], "UserIdentity | None"]

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _secret_from_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    if os.getenv("NODE_ENV") == "production":
        raise RuntimeError(f"Missing required production environment variable: {name}")
    return secrets.token_hex(32)


class AuthError(Exception):
    def __init__(self, message: str, status_code: int, code: str) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


@dataclass(frozen=True)
class UserIdentity:
    id: str
    username: str
    role: str = "user"


@dataclass(frozen=True)
class AuthSettings:
    jwt_secret: str
    jwt_refresh_secret: str
    auth_username: str
    auth_password: str
    access_cookie_name: str = "elysia_access_token"
    refresh_cookie_name: str = "elysia_refresh_token"
    csrf_cookie_name: str = "elysia_csrf_token"
    access_ttl_seconds: int = 15 * 60
    refresh_ttl_seconds: int = 7 * 24 * 60 * 60
    cookie_same_site: Literal["lax", "strict", "none"] = "lax"
    cookie_secure: bool | None = None

    @classmethod
    def from_env(cls) -> AuthSettings:
        return cls(
            jwt_secret=_secret_from_env("JWT_SECRET"),
            jwt_refresh_secret=_secret_from_env("JWT_REFRESH_SECRET"),
            auth_username=os.getenv("AUTH_USERNAME", "admin"),
            auth_password=os.getenv("AUTH_PASSWORD", ""),
            access_ttl_seconds=int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", str(15 * 60))),
            refresh_ttl_seconds=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60))),
            cookie_secure=_env_bool_or_none("AUTH_COOKIE_SECURE"),
        )


@dataclass
class RefreshTokenRecord:
    token_hash: str
    user: UserIdentity
    expires_at: int
    revoked: bool = False


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int


class InMemoryRefreshTokenStore:
    def __init__(self) -> None:
        self._tokens: dict[str, RefreshTokenRecord] = {}

    async def create(self, refresh_token: str, user: UserIdentity, expires_at: int) -> None:
        token_hash = hash_token(refresh_token)
        self._tokens[token_hash] = RefreshTokenRecord(token_hash=token_hash, user=user, expires_at=expires_at)

    async def find(self, refresh_token: str) -> RefreshTokenRecord | None:
        return self._tokens.get(hash_token(refresh_token))

    async def revoke(self, refresh_token: str) -> None:
        token_hash = hash_token(refresh_token)
        record = self._tokens.get(token_hash)
        if record:
            record.revoked = True

    def clear(self) -> None:
        self._tokens.clear()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refresh_token: str | None = Field(default=None, alias="refreshToken")


class SessionUser(BaseModel):
    id: str
    username: str
    role: str


class AuthSessionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    authenticated: bool
    token_type: str = Field(default="Bearer", alias="tokenType")
    transport: Literal["httpOnly-cookie"] = "httpOnly-cookie"
    expires_in: int | None = Field(default=None, alias="expiresIn")
    username: str | None = None
    role: str | None = None
    user: SessionUser | None = None
    expires_at: str | None = Field(default=None, alias="expiresAt")
    csrf_token: str | None = Field(default=None, alias="csrfToken")


class AuthService:
    def __init__(
        self,
        settings: AuthSettings | None = None,
        refresh_store: InMemoryRefreshTokenStore | None = None,
        credential_verifier: CredentialVerifier | None = None,
    ) -> None:
        self.settings = settings or AuthSettings.from_env()
        self.refresh_store = refresh_store or InMemoryRefreshTokenStore()
        self.credential_verifier = credential_verifier or self._verify_env_credentials

    async def login(self, request: Request, response: Response, username: str, password: str) -> dict[str, Any]:
        user = await self._authenticate(username, password)
        if not user:
            raise AuthError("Invalid username or password", 401, "AUTH_INVALID_CREDENTIALS")

        tokens = await self.issue_token_pair(user)
        csrf_token = create_csrf_token()
        self.set_auth_cookies(request, response, tokens, csrf_token)
        return self.auth_response(user, tokens, csrf_token)

    async def refresh(
        self,
        request: Request,
        response: Response,
        body_refresh_token: str | None = None,
    ) -> dict[str, Any]:
        resolved = self.resolve_refresh_token(request, body_refresh_token)
        if not resolved:
            raise AuthError("Missing refresh token", 401, "AUTH_REFRESH_REQUIRED")

        token, source = resolved
        assert_csrf_for_cookie_auth(request, source, self.settings)

        payload = decode_jwt(token, self.settings.jwt_refresh_secret, expected_type="refresh")
        record = await self.refresh_store.find(token)
        now = current_timestamp()
        if not record or record.revoked or record.expires_at <= now:
            raise AuthError("Invalid or expired refresh token", 401, "AUTH_REFRESH_INVALID")

        await self.refresh_store.revoke(token)
        user = record.user
        tokens = await self.issue_token_pair(user)
        csrf_token = create_csrf_token()
        self.set_auth_cookies(request, response, tokens, csrf_token)

        return {
            "authenticated": True,
            "tokenType": "Bearer",
            "transport": "httpOnly-cookie",
            "expiresIn": tokens.expires_in,
            "csrfToken": csrf_token,
            "username": payload.get("username", user.username),
            "role": payload.get("role", user.role),
        }

    async def logout(
        self,
        request: Request,
        response: Response,
        body_refresh_token: str | None = None,
    ) -> dict[str, str]:
        resolved = self.resolve_refresh_token(request, body_refresh_token)
        if resolved:
            token, source = resolved
            assert_csrf_for_cookie_auth(request, source, self.settings)
            try:
                decode_jwt(token, self.settings.jwt_refresh_secret, expected_type="refresh")
                await self.refresh_store.revoke(token)
            except AuthError:
                pass

        self.clear_auth_cookies(request, response)
        return {"message": "Logged out successfully"}

    def session(self, request: Request) -> dict[str, Any]:
        resolved = self.resolve_access_token(request)
        if not resolved:
            return {"authenticated": False, "transport": "httpOnly-cookie"}

        token, source = resolved
        assert_csrf_for_cookie_auth(request, source, self.settings)
        payload = decode_jwt(token, self.settings.jwt_secret, expected_type="access")
        user = user_from_payload(payload)
        return {
            "authenticated": True,
            "transport": "httpOnly-cookie",
            "user": user.__dict__,
            "expiresAt": timestamp_to_iso(int(payload["exp"])),
        }

    def require_current_user(self, request: Request) -> UserIdentity:
        resolved = self.resolve_access_token(request)
        if not resolved:
            raise AuthError("Missing access token", 401, "AUTH_REQUIRED")

        token, source = resolved
        assert_csrf_for_cookie_auth(request, source, self.settings)
        payload = decode_jwt(token, self.settings.jwt_secret, expected_type="access")
        return user_from_payload(payload)

    async def issue_token_pair(self, user: UserIdentity) -> TokenPair:
        now = current_timestamp()
        access_token = encode_jwt(
            {
                "sub": user.id,
                "username": user.username,
                "role": user.role,
                "typ": "access",
                "iat": now,
                "exp": now + self.settings.access_ttl_seconds,
            },
            self.settings.jwt_secret,
        )
        refresh_token = encode_jwt(
            {
                "sub": user.id,
                "username": user.username,
                "role": user.role,
                "typ": "refresh",
                "jti": str(uuid.uuid4()),
                "iat": now,
                "exp": now + self.settings.refresh_ttl_seconds,
            },
            self.settings.jwt_refresh_secret,
        )
        await self.refresh_store.create(refresh_token, user, now + self.settings.refresh_ttl_seconds)
        return TokenPair(access_token=access_token, refresh_token=refresh_token, expires_in=self.settings.access_ttl_seconds)

    def auth_response(self, user: UserIdentity, tokens: TokenPair, csrf_token: str) -> dict[str, Any]:
        return {
            "authenticated": True,
            "tokenType": "Bearer",
            "transport": "httpOnly-cookie",
            "expiresIn": tokens.expires_in,
            "username": user.username,
            "role": user.role,
            "csrfToken": csrf_token,
        }

    def set_auth_cookies(self, request: Request, response: Response, tokens: TokenPair, csrf_token: str) -> None:
        secure = self.cookie_secure(request)
        response.headers["Cache-Control"] = "no-store"
        response.set_cookie(
            self.settings.access_cookie_name,
            tokens.access_token,
            max_age=self.settings.access_ttl_seconds,
            httponly=True,
            secure=secure,
            samesite=self.settings.cookie_same_site,
            path="/",
        )
        response.set_cookie(
            self.settings.refresh_cookie_name,
            tokens.refresh_token,
            max_age=self.settings.refresh_ttl_seconds,
            httponly=True,
            secure=secure,
            samesite=self.settings.cookie_same_site,
            path="/",
        )
        response.set_cookie(
            self.settings.csrf_cookie_name,
            csrf_token,
            max_age=self.settings.refresh_ttl_seconds,
            httponly=False,
            secure=secure,
            samesite=self.settings.cookie_same_site,
            path="/",
        )

    def clear_auth_cookies(self, request: Request, response: Response) -> None:
        secure = self.cookie_secure(request)
        response.headers["Cache-Control"] = "no-store"
        for name in (
            self.settings.access_cookie_name,
            self.settings.refresh_cookie_name,
            self.settings.csrf_cookie_name,
        ):
            response.delete_cookie(name, path="/", secure=secure, samesite=self.settings.cookie_same_site)

    def resolve_access_token(self, request: Request) -> tuple[str, TokenSource] | None:
        bearer_token = get_bearer_token(request.headers.get("authorization"))
        if bearer_token:
            return bearer_token, "authorization"

        cookie_token = request.cookies.get(self.settings.access_cookie_name)
        return (cookie_token, "cookie") if cookie_token else None

    def resolve_refresh_token(
        self,
        request: Request,
        body_refresh_token: str | None = None,
    ) -> tuple[str, RefreshTokenSource] | None:
        if body_refresh_token and body_refresh_token.strip():
            return body_refresh_token.strip(), "body"

        cookie_token = request.cookies.get(self.settings.refresh_cookie_name)
        return (cookie_token, "cookie") if cookie_token else None

    def cookie_secure(self, request: Request) -> bool:
        if self.settings.cookie_secure is not None:
            return self.settings.cookie_secure
        return request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"

    async def _authenticate(self, username: str, password: str) -> UserIdentity | None:
        result = self.credential_verifier(username, password)
        if inspect.isawaitable(result):
            result = await result
        return result

    def _verify_env_credentials(self, username: str, password: str) -> UserIdentity | None:
        username_ok = hmac.compare_digest(username, self.settings.auth_username)
        password_ok = hmac.compare_digest(password, self.settings.auth_password)
        if not username_ok or not password_ok:
            return None
        return UserIdentity(id=f"local-{self.settings.auth_username}", username=self.settings.auth_username, role="admin")


def create_auth_router(service: AuthService | None = None) -> APIRouter:
    auth_service = service or AuthService()
    router = APIRouter(prefix="/auth", tags=["auth"])

    @router.post("/token", response_model=AuthSessionResponse)
    async def login(payload: LoginRequest, request: Request, response: Response) -> dict[str, Any]:
        return await auth_service.login(request, response, payload.username, payload.password)

    @router.post("/refresh", response_model=AuthSessionResponse)
    async def refresh(payload: RefreshRequest, request: Request, response: Response) -> dict[str, Any]:
        return await auth_service.refresh(request, response, payload.refresh_token)

    @router.post("/logout")
    async def logout(payload: RefreshRequest, request: Request, response: Response) -> dict[str, str]:
        return await auth_service.logout(request, response, payload.refresh_token)

    @router.get("/session")
    async def session(request: Request) -> dict[str, Any]:
        return auth_service.session(request)

    return router


async def auth_exception_handler(_request: Request, exc: AuthError) -> JSONResponse:
    return auth_error_response(exc.status_code, exc.message, exc.code)


def auth_error_response(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": message,
            "code": code,
            "status": status_code,
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        },
        headers={"Cache-Control": "no-store"},
    )


def encode_jwt(payload: dict[str, Any], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            base64url_json(header),
            base64url_json(payload),
        ]
    )
    signature = hmac.new(secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{base64url_encode(signature)}"


def decode_jwt(token: str, secret: str, expected_type: Literal["access", "refresh"]) -> dict[str, Any]:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except (ValueError, binascii.Error):
        raise AuthError("Malformed token", 401, "AUTH_TOKEN_INVALID")

    signing_input = f"{header_segment}.{payload_segment}"
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    try:
        received_signature = base64url_decode(signature_segment)
    except ValueError:
        raise AuthError("Malformed token", 401, "AUTH_TOKEN_INVALID")
    if not hmac.compare_digest(expected_signature, received_signature):
        raise AuthError("Invalid token signature", 401, "AUTH_TOKEN_INVALID")

    try:
        header = json.loads(base64url_decode(header_segment))
    except (ValueError, binascii.Error, json.JSONDecodeError):
        raise AuthError("Malformed token", 401, "AUTH_TOKEN_INVALID")
    if header.get("alg") != "HS256":
        raise AuthError("Unsupported token algorithm", 401, "AUTH_TOKEN_INVALID")

    try:
        payload = json.loads(base64url_decode(payload_segment))
    except (ValueError, binascii.Error, json.JSONDecodeError):
        raise AuthError("Malformed token", 401, "AUTH_TOKEN_INVALID")
    if payload.get("typ") != expected_type:
        raise AuthError("Unexpected token type", 401, "AUTH_TOKEN_INVALID")
    if int(payload.get("exp", 0)) <= current_timestamp():
        raise AuthError("Token has expired", 401, "AUTH_TOKEN_INVALID")
    return payload


def user_from_payload(payload: dict[str, Any]) -> UserIdentity:
    subject = payload.get("sub")
    username = payload.get("username")
    role = payload.get("role", "user")
    if not isinstance(subject, str) or not isinstance(username, str):
        raise AuthError("Token payload is incomplete", 401, "AUTH_TOKEN_INVALID")
    return UserIdentity(id=subject, username=username, role=str(role))


def assert_csrf_for_cookie_auth(
    request: Request,
    source: TokenSource | RefreshTokenSource,
    settings: AuthSettings,
) -> None:
    if source != "cookie" or request.method.upper() not in UNSAFE_METHODS:
        return

    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get("x-csrf-token")
    if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
        raise AuthError("CSRF token mismatch", 403, "CSRF_TOKEN_INVALID")


def get_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.strip().partition(" ")
    if scheme.lower() != "bearer" or not token or token in {"undefined", "null"}:
        return None
    return token


def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def current_timestamp() -> int:
    return int(time.time())


def timestamp_to_iso(timestamp: int) -> str:
    return datetime.fromtimestamp(timestamp, UTC).isoformat().replace("+00:00", "Z")


def base64url_json(value: dict[str, Any]) -> str:
    data = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64url_encode(data)


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def _env_bool_or_none(name: str) -> bool | None:
    value = os.getenv(name)
    if value is None or value == "":
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}
