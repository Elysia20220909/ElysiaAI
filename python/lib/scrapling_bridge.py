"""Scrapling-backed page extraction helpers for ElysiaAI.

The module prefers Scrapling's parser and fetchers when installed,
providing stealth and dynamic browsing capabilities for high-density intelligence.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import base64
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from typing import Any, Literal
from urllib.parse import urlparse

import httpx

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

ExtractionType = Literal["markdown", "html", "text"]
FetcherMode = Literal["httpx", "stealth", "dynamic"]


@dataclass(slots=True)
class ExtractedPage:
    url: str
    title: str
    description: str
    text: str
    engine: str
    screenshot: str | None = None  # Base64 encoded image


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


def _extract_with_scrapling(
    html: str, 
    url: str, 
    main_content_only: bool = False,
    extraction_type: ExtractionType = "text"
) -> ExtractedPage | None:
    try:
        from scrapling.parser import Selector
        from scrapling.core.shell import Convertor
    except Exception:
        return None

    try:
        page = Selector(html, url=url)
        title = _first_text(page, "title::text")
        description = _first_text(page, 'meta[name="description"]::attr(content)') or _first_text(
            page,
            'meta[property="og:description"]::attr(content)',
        )

        if main_content_only:
            # Aggressively focus on main content containers for AI-targeted mode
            main_node = page.css("main").first or page.css("article").first or page.css("body").first
            if main_node:
                page = main_node

        content_gen = Convertor._extract_content(
            page, 
            extraction_type=extraction_type, 
            main_content_only=main_content_only
        )
        text = "".join(content_gen).strip()

        return ExtractedPage(
            url=url,
            title=title,
            description=description,
            text=text,
            engine="scrapling-selector",
        )
    except Exception:
        return None


def extract_html(
    html: str, 
    url: str = "", 
    main_content_only: bool = False,
    extraction_type: ExtractionType = "text"
) -> ExtractedPage:
    scrapling_result = _extract_with_scrapling(html, url, main_content_only, extraction_type)
    if scrapling_result and (scrapling_result.text or scrapling_result.title):
        return scrapling_result

    parser = _FallbackHTMLExtractor()
    parser.feed(html)
    return parser.result(url)


def _fetch_with_browser(
    url: str, 
    mode: FetcherMode, 
    timeout: float = 30000,
    screenshot: bool = False
) -> tuple[str, str | None, str]:
    """Fetch URL using Scrapling browser fetchers."""
    try:
        from scrapling.fetchers import StealthyFetcher, DynamicFetcher
    except ImportError:
        raise ImportError("Scrapling fetchers not installed. Run `pip install 'scrapling[fetchers]'`")

    fetcher_class = StealthyFetcher if mode == "stealth" else DynamicFetcher
    # Timeout in ms for Scrapling
    fetcher = fetcher_class(timeout=timeout)
    
    screenshot_b64 = None
    
    if screenshot:
        def capture_screenshot(page):
            nonlocal screenshot_b64
            # Use base64 for JSON transport
            img_bytes = page.screenshot(type="jpeg", quality=80)
            screenshot_b64 = base64.b64encode(img_bytes).decode("utf-8")

        response = fetcher.fetch(url, page_action=capture_screenshot)
    else:
        response = fetcher.fetch(url)

    return response.html_content, screenshot_b64, f"scrapling-{mode}-fetcher"


def extract_url(
    url: str, 
    timeout: float = 15.0, 
    mode: FetcherMode = "httpx",
    main_content_only: bool = False,
    extraction_type: ExtractionType = "text",
    screenshot: bool = False
) -> ExtractedPage:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https URLs are supported")

    if mode in {"stealth", "dynamic"}:
        html, screenshot_b64, engine = _fetch_with_browser(url, mode, timeout=timeout * 1000, screenshot=screenshot)
        result = extract_html(html, url, main_content_only, extraction_type)
        result.screenshot = screenshot_b64
        result.engine = f"{result.engine} ({engine})"
        return result

    # Default httpx mode
    response = httpx.get(
        url,
        follow_redirects=True,
        headers={"User-Agent": DEFAULT_USER_AGENT},
        timeout=timeout,
    )
    response.raise_for_status()
    return extract_html(response.text, str(response.url), main_content_only, extraction_type)


def _run_cli(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Extract readable page content with Scrapling.")
    parser.add_argument("url", nargs="?", help="HTTP or HTTPS URL to extract")
    parser.add_argument("--html-file", help="Read HTML from a local file instead of fetching a URL")
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--max-chars", type=int, default=10000)
    parser.add_argument("--mode", choices=["httpx", "stealth", "dynamic"], default="httpx", help="Fetcher mode")
    parser.add_argument("--ai-targeted", action="store_true", help="Enable high-density AI-targeted extraction")
    parser.add_argument("--extraction-type", choices=["text", "markdown", "html"], default="text")
    parser.add_argument("--screenshot", action="store_true", help="Capture a screenshot (requires stealth or dynamic mode)")
    args = parser.parse_args(argv)

    try:
        if args.html_file:
            with open(args.html_file, encoding="utf-8") as file:
                result = extract_html(
                    file.read(), 
                    args.url or "", 
                    main_content_only=args.ai_targeted,
                    extraction_type=args.extraction_type
                )
        elif args.url:
            result = extract_url(
                args.url, 
                timeout=args.timeout, 
                mode=args.mode,
                main_content_only=args.ai_targeted,
                extraction_type=args.extraction_type,
                screenshot=args.screenshot
            )
        else:
            parser.error("a URL or --html-file is required")

        payload = asdict(result)
        if payload["text"]:
            payload["text"] = payload["text"][: args.max_chars]
            
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(_run_cli(sys.argv[1:]))
