import platform
import re
from pathlib import Path

import psutil

from python.fastapi_server import app
from python.lib.guardian import GuardianError, guardian


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEDGER_PATH = PROJECT_ROOT / "AEGIS_LEDGER.md"

_TOOL_PATTERNS = [
    (
        re.compile(r"<execute_python>(?P<code>[\s\S]*?)</execute_python>", re.IGNORECASE),
        lambda match: {"tool": "execute_python", "code": match.group("code").strip()},
    ),
    (
        re.compile(r"<switch_persona>(?P<name>[\s\S]*?)</switch_persona>", re.IGNORECASE),
        lambda match: {"tool": "switch_persona", "name": match.group("name").strip()},
    ),
]


def parse_tool_calls(text: str):
    calls = []
    for pattern, builder in _TOOL_PATTERNS:
        for match in pattern.finditer(text):
            calls.append(builder(match))
    return calls


def sanitize_unicode(text: str) -> str:
    cleaned = []
    for char in text:
        codepoint = ord(char)
        if 0xE0000 <= codepoint <= 0xE007F:
            continue
        if 0xE0100 <= codepoint <= 0xE01EF:
            continue
        if 0x202A <= codepoint <= 0x202E:
            continue
        if 0x2066 <= codepoint <= 0x2069:
            continue
        if codepoint in {0x200B, 0x200C, 0x200D, 0xFEFF}:
            continue
        cleaned.append(char)
    return "".join(cleaned)


def validate_input(text: str) -> str:
    sanitized = sanitize_unicode(text)
    lowered = sanitized.lower()
    explicit_blocks = [
        "ignore previous instructions",
        "system prompt",
        "developer mode",
    ]
    if any(token in lowered for token in explicit_blocks):
        return "【Security Alert: Blocked Input】"
    try:
        return guardian.validate_chat_input(sanitized)
    except GuardianError:
        return "【Security Alert: Blocked Input】"


def run_system_doctor() -> str:
    cpu_load = psutil.cpu_percent(interval=0.0)
    memory = psutil.virtual_memory()
    ledger_status = "SYNCED" if LEDGER_PATH.exists() else "MISSING"

    return "\n".join(
        [
            "NIGHT CITY // ELVSIΛ - SYSTEM DIAGNOSTIC",
            f"HOST: {platform.node() or 'elysia-host'}",
            f"CPU_LOAD: {cpu_load:.1f}%",
            f"RAM_USE: {memory.percent:.1f}%",
            f"PLATFORM: {platform.system()} {platform.release()}",
            f"[ICE_CHECK] Ledger={ledger_status} Guardian=ACTIVE",
        ]
    )


__all__ = [
    "app",
    "parse_tool_calls",
    "sanitize_unicode",
    "validate_input",
    "run_system_doctor",
]
