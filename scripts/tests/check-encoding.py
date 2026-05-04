from __future__ import annotations

import subprocess
import sys
from pathlib import Path


if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

TEXT_SUFFIXES = {
    ".css",
    ".cjs",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".ps1",
    ".py",
    ".rs",
    ".sh",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}

TEXT_FILENAMES = {
    ".dockerignore",
    ".editorconfig",
    ".env.example",
    ".gitattributes",
    ".gitignore",
    ".npmrc",
    ".yarnrc.yml",
    "Dockerfile",
    "LICENSE",
    "Makefile",
}

MOJIBAKE_MARKERS = {
    chr(0xFFFD): "Unicode replacement character",
    chr(0x00C3): "UTF-8 text decoded as Latin-1/Windows-1252",
    chr(0x00C2): "Extra Latin-1 spacing marker",
    f"{chr(0x00E2)}{chr(0x20AC)}": "Smart quote or dash decoded as Latin-1/Windows-1252",
    f"{chr(0x00E2)}{chr(0x20AC)}{chr(0x2122)}": "Apostrophe decoded as Latin-1/Windows-1252",
    f"{chr(0x00E2)}{chr(0x20AC)}{chr(0x0153)}": "Opening quote decoded as Latin-1/Windows-1252",
    f"{chr(0x00E2)}{chr(0x20AC)}{chr(0xFFFD)}": "Closing quote decoded as Latin-1/Windows-1252",
    f"{chr(0x00F0)}{chr(0x0178)}": "Emoji decoded as Latin-1/Windows-1252",
    chr(0x7AB6): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x7E3A): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x7E67): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x7E5D): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x8B41): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x8373): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x8711): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x9015): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x9B06): "Japanese CP932/UTF-8 mojibake marker",
    chr(0x83A0): "Japanese CP932/UTF-8 mojibake marker",
}

SKIP_PARTS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tmp",
    ".venv",
    "coverage",
    "dist",
    "node_modules",
}


def is_text_target(path: Path) -> bool:
    return path.name in TEXT_FILENAMES or path.suffix.lower() in TEXT_SUFFIXES


def tracked_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    except (OSError, subprocess.CalledProcessError):
        return [
            path
            for path in Path(".").rglob("*")
            if path.is_file() and not any(part in SKIP_PARTS for part in path.parts)
        ]

    return [Path(line) for line in result.stdout.splitlines() if line.strip()]


def line_col(text: str, index: int) -> tuple[int, int]:
    line = text.count("\n", 0, index) + 1
    line_start = text.rfind("\n", 0, index) + 1
    return line, index - line_start + 1


def main() -> int:
    utf8_failures: list[str] = []
    mojibake_hits: list[str] = []

    for path in tracked_files():
        if not is_text_target(path):
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            utf8_failures.append(f"{path}:{exc.start + 1} {exc.reason}")
            continue
        except OSError:
            continue

        for marker, reason in MOJIBAKE_MARKERS.items():
            index = text.find(marker)
            if index == -1:
                continue
            line, column = line_col(text, index)
            mojibake_hits.append(f"{path}:{line}:{column} {reason} ({marker!r})")

    if utf8_failures or mojibake_hits:
        print("Encoding guard failed / エンコーディング検査に失敗しました。")
        if utf8_failures:
            print("\nFiles that are not valid UTF-8 / UTF-8として読めないファイル:")
            for failure in utf8_failures:
                print(f"  - {failure}")
        if mojibake_hits:
            print("\nPossible mojibake / 文字化けの可能性:")
            for hit in mojibake_hits:
                print(f"  - {hit}")
        print("\nFix the text in Japanese or English, then rerun this check.")
        print("日本語または英語として正しい文字列に直してから再実行してください。")
        return 1

    print("Encoding guard passed / UTF-8と文字化け検査に合格しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
