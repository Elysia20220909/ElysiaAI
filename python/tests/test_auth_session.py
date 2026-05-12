from fastapi import FastAPI
from fastapi.testclient import TestClient

from python.lib.auth_session import (
    AuthError,
    AuthService,
    AuthSettings,
    InMemoryRefreshTokenStore,
    auth_exception_handler,
    create_auth_router,
)


def build_client() -> TestClient:
    settings = AuthSettings(
        jwt_secret="test-access-secret",  # noqa: S106 - test-only secret
        jwt_refresh_secret="test-refresh-secret",  # noqa: S106 - test-only secret
        auth_username="admin",
        auth_password="correct-password",  # noqa: S106 - test-only password
        cookie_secure=False,
    )
    service = AuthService(settings=settings, refresh_store=InMemoryRefreshTokenStore())
    app = FastAPI()
    app.add_exception_handler(AuthError, auth_exception_handler)
    app.include_router(create_auth_router(service))
    return TestClient(app)


def test_login_sets_http_only_auth_cookies_without_exposing_tokens() -> None:
    client = build_client()

    response = client.post("/auth/token", json={"username": "admin", "password": "correct-password"})

    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["transport"] == "httpOnly-cookie"
    assert "csrfToken" in body
    assert "accessToken" not in body
    assert "refreshToken" not in body

    set_cookie = response.headers.get("set-cookie", "")
    assert "elysia_access_token=" in set_cookie
    assert "elysia_refresh_token=" in set_cookie
    assert "elysia_csrf_token=" in set_cookie
    assert set_cookie.count("HttpOnly") == 2
    assert "SameSite=lax" in set_cookie


def test_refresh_requires_csrf_for_cookie_backed_session() -> None:
    client = build_client()
    login = client.post("/auth/token", json={"username": "admin", "password": "correct-password"})
    csrf_token = login.json()["csrfToken"]

    missing_csrf = client.post("/auth/refresh", json={})
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["code"] == "CSRF_TOKEN_INVALID"

    refreshed = client.post("/auth/refresh", json={}, headers={"x-csrf-token": csrf_token})
    assert refreshed.status_code == 200
    assert refreshed.json()["csrfToken"] != csrf_token


def test_session_and_logout_use_cookie_session() -> None:
    client = build_client()
    login = client.post("/auth/token", json={"username": "admin", "password": "correct-password"})
    csrf_token = login.json()["csrfToken"]

    session = client.get("/auth/session")
    assert session.status_code == 200
    assert session.json()["authenticated"] is True
    assert session.json()["user"]["username"] == "admin"

    logout = client.post("/auth/logout", json={}, headers={"x-csrf-token": csrf_token})
    assert logout.status_code == 200

    after_logout = client.get("/auth/session")
    assert after_logout.status_code == 200
    assert after_logout.json()["authenticated"] is False


def test_invalid_credentials_return_stable_error_envelope() -> None:
    client = build_client()

    response = client.post("/auth/token", json={"username": "admin", "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    assert response.json()["status"] == 401
    assert "timestamp" in response.json()
