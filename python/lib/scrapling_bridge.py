"""Scrapling-backed page extraction helpers for ElysiaAI.

The module prefers Scrapling's parser when it is installed, then falls back to a
small stdlib parser so the rest of ElysiaAI can keep running in lean setups.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

import httpx


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


@dataclass(slots=True)
class ExtractedPage:
    url: str
    title: str
    description: str
    text: str
    engine: str


class _FallbackHTMLExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self._tag_stack: list[str] = []
        self._text_parts: list[str] = []
        self._title_parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lower_tag = tag.lower()
        self._tag_stack.append(lower_tag)

        if lower_tag in {"script", "style", "noscript", "template", "svg"}:
            self._skip_depth += 1
            return

        if lower_tag == "meta":
            attr_map = {name.lower(): value or "" for name, value in attrs}
            meta_name = attr_map.get("name", "").lower()
            meta_property = attr_map.get("property", "").lower()
            if meta_name == "description" or meta_property == "og:description":
                self.description = self.description or attr_map.get("content", "")

    def handle_endtag(self, tag: str) -> None:
        lower_tag = tag.lower()
        if lower_tag in {"script", "style", "noscript", "template", "svg"} and self._skip_depth:
            self._skip_depth -= 1

        if self._tag_stack:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return

        text = _clean_text(data)
        if not text:
            return

        if self._tag_stack and self._tag_stack[-1] == "title":
            self._title_parts.append(text)
        else:
            self._text_parts.append(text)

    def result(self, url: str) -> ExtractedPage:
        title = _clean_text(" ".join(self._title_parts))
        text = _clean_text(" ".join(self._text_parts))
        return ExtractedPage(
            url=url,
            title=title,
            description=_clean_text(self.description),
            text=text,
            engine="stdlib-html-parser",
        )


def _clean_text(value: Any) -> str:
    text = "" if value is None else str(value)
    return re.sub(r"\s+", " ", text).strip()


def _first_text(selector: Any, query: str) -> str:
    try:
        result = selector.css(query)
        if hasattr(result, "get"):
            return _clean_text(result.get())
    except Exception:
        return ""
    return ""


def _all_text(selector: Any, query: str) -> list[str]:
    try:
        result = selector.css(query)
        if hasattr(result, "getall"):
            return [_clean_text(item) for item in result.getall() if _clean_text(item)]
    except Exception:
        return []
    return []


def _extract_with_scrapling(html: str, url: str) -> ExtractedPage | None:
    try:
        from scrapling.parser import Selector
    except Exception:
        return None

    try:
        page = Selector(html)
        title = _first_text(page, "title::text")
        description = _first_text(page, 'meta[name="description"]::attr(content)') or _first_text(
            page,
            'meta[property="og:description"]::attr(content)',
        )
        text_parts = _all_text(page, "main ::text") or _all_text(page, "article ::text") or _all_text(page, "body ::text")
        text = _clean_text(" ".join(text_parts))

        return ExtractedPage(
            url=url,
            title=title,
            description=description,
            text=text,
            engine="scrapling-selector",
        )
    except Exception:
        return None


def extract_html(html: str, url: str = "") -> ExtractedPage:
    scrapling_result = _extract_with_scrapling(html, url)
    if scrapling_result and (scrapling_result.text or scrapling_result.title):
        return scrapling_result

    parser = _FallbackHTMLExtractor()
    parser.feed(html)
    return parser.result(url)


def extract_url(url: str, timeout: float = 15.0) -> ExtractedPage:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https URLs are supported")

    response = httpx.get(
        url,
        follow_redirects=True,
        headers={"User-Agent": DEFAULT_USER_AGENT},
        timeout=timeout,
    )
    response.raise_for_status()
    return extract_html(response.text, str(response.url))


def _run_cli(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Extract readable page content with Scrapling.")
    parser.add_argument("url", nargs="?", help="HTTP or HTTPS URL to extract")
    parser.add_argument("--html-file", help="Read HTML from a local file instead of fetching a URL")
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--max-chars", type=int, default=4000)
    args = parser.parse_args(argv)

    try:
        if args.html_file:
            with open(args.html_file, encoding="utf-8") as file:
                result = extract_html(file.read(), args.url or "")
        elif args.url:
            result = extract_url(args.url, timeout=args.timeout)
        else:
            parser.error("a URL or --html-file is required")

        payload = asdict(result)
        payload["text"] = payload["text"][: args.max_chars]
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(_run_cli(sys.argv[1:]))
