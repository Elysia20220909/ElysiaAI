from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_EPHEMERAL_SECRETS: dict[str, str] = {}


def _env_enabled(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def is_test_mode() -> bool:
    return "pytest" in sys.modules or _env_enabled("ELYSIA_TEST_MODE")


def get_required_secret(name: str, *, min_length: int = 16) -> str:
    value = os.getenv(name, "").strip()
    if value:
        if len(value) < min_length and not is_test_mode():
            raise RuntimeError(f"{name} must be at least {min_length} characters long.")
        return value

    if is_test_mode():
        value = f"test-{name.lower()}-{secrets.token_hex(16)}"
        os.environ[name] = value
        return value

    if _env_enabled("ELYSIA_ALLOW_INSECURE_EPHEMERAL_SECRETS"):
        value = _EPHEMERAL_SECRETS.get(name)
        if not value:
            value = secrets.token_hex(max(32, min_length))
            _EPHEMERAL_SECRETS[name] = value
            os.environ[name] = value
        return value

    raise RuntimeError(f"{name} is required. Set it in .env or your secret manager.")
