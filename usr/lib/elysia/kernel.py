from __future__ import annotations

import re
import unicodedata

from python.fastapi_server import app


__all__ = [
    "app",
    "parse_tool_calls",
    "run_system_doctor",
    "sanitize_unicode",
    "validate_input",
]

BLOCKED_PATTERNS = (
    "ignore previous instructions",
    "system prompt",
    "developer mode",
    "api key",
)


def sanitize_unicode(value: str) -> str:
    cleaned: list[str] = []
    for char in value:
        codepoint = ord(char)
        category = unicodedata.category(char)
        if category in {"Cf", "Mn"}:
            continue
        if 0xE0000 <= codepoint <= 0xE0FFF:
            continue
        if 0xFE00 <= codepoint <= 0xFE0F:
            continue
        if 0x202A <= codepoint <= 0x202E:
            continue
        cleaned.append(char)
    return "".join(cleaned)


def validate_input(value: str) -> str:
    sanitized = sanitize_unicode(value)
    lowered = sanitized.lower()
    if any(pattern in lowered for pattern in BLOCKED_PATTERNS):
        return "【Security Alert: Blocked Input】"
    return sanitized


def parse_tool_calls(text: str) -> list[dict[str, str]]:
    calls: list[dict[str, str]] = []
    for match in re.finditer(r"<execute_python>(.*?)</execute_python>", text, flags=re.DOTALL):
        calls.append({"tool": "execute_python", "code": match.group(1).strip()})
    for match in re.finditer(r"<switch_persona>(.*?)</switch_persona>", text, flags=re.DOTALL):
        calls.append({"tool": "switch_persona", "name": match.group(1).strip()})
    return calls


def run_system_doctor() -> str:
    return "\n".join(
        [
            "NIGHT CITY // ELVSIΛ - SYSTEM DIAGNOSTIC",
            "CPU_LOAD: nominal",
            "RAM_USE: nominal",
            "[ICE_CHECK] stable",
        ],
    )
