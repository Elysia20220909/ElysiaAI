# Scrapling Integration Guide

This document describes how ElysiaAI integrates [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) for page extraction and web intelligence. The Japanese version is available at [SCRAPLING_INTEGRATION.md](./SCRAPLING_INTEGRATION.md).

## Verified upstream

As of 2026-05-03, the latest Scrapling release on PyPI is `0.4.7`. ElysiaAI pins the same release line in both `requirements.txt` and `pyproject.toml`.

Scrapling upstream documentation is organized as follows:

- `README.md`: English overview
- `docs/README_JP.md`: Japanese overview
- `docs/fetching/`, `docs/parsing/`, `docs/spiders/`, `docs/cli/`, `docs/ai/`, `docs/api-reference/`: detailed English documentation
- ReadTheDocs: <https://scrapling.readthedocs.io/en/latest/>

ElysiaAI does not mirror the entire upstream documentation set. Instead, this guide documents the subset that matters for ElysiaAI's search and extraction pipeline.

## Role in ElysiaAI

Scrapling extracts readable page content from URLs discovered by the web search layer. The Bun/Elysia server invokes a Python bridge, and the Python bridge uses Scrapling's `Selector` plus optional fetchers when richer retrieval is required.

Relevant files:

- `packages/server/src/lib/web-search.ts`: selects URLs from web search results and asks for extracted content.
- `packages/server/src/lib/scrapling-client.ts`: safely invokes the Python bridge from Bun.
- `python/lib/scrapling_bridge.py`: performs Scrapling parsing, optional fetching, and stdlib fallback extraction.

## Setup

For normal text extraction, install the standard Python dependencies.

```bash
python -m pip install -r requirements.txt
```

For browser-backed retrieval, stealth fetching, or pages with stronger bot protection, install Scrapling's fetcher extras and browser assets.

```bash
python -m pip install "scrapling[fetchers]==0.4.7"
scrapling install
```

To force the Bun server to use a specific Python executable, set `ELYSIA_PYTHON`.

```powershell
$env:ELYSIA_PYTHON = "C:\Path\To\python.exe"
```

## Extraction modes

| Mode | Purpose | Extra dependencies |
| --- | --- | --- |
| `httpx` | Default lightweight retrieval | None |
| `fetcher` | Scrapling HTTP fetcher with browser-like retrieval | `scrapling[fetchers]` |
| `dynamic` | Pages that require JavaScript execution | `scrapling[fetchers]` and `scrapling install` |
| `stealth` | Public pages with stronger bot protection | `scrapling[fetchers]` and `scrapling install` |

The output format can be `text`, `markdown`, or `html`. For AI context, prefer `text` or `markdown`. With `--ai-targeted`, the bridge prioritizes `main`, `article`, `[role="main"]`, and then `body` to reduce boilerplate.

## CLI verification

Minimal verification with a local HTML file:

```bash
python python/lib/scrapling_bridge.py \
  --html-file scratch/example.html \
  https://example.test \
  --max-chars 1000
```

Direct URL retrieval:

```bash
python python/lib/scrapling_bridge.py https://example.com --mode httpx --max-chars 1000
```

Scrapling HTTP fetcher retrieval:

```bash
python python/lib/scrapling_bridge.py https://example.com --mode fetcher --max-chars 1000
```

Markdown extraction:

```bash
python python/lib/scrapling_bridge.py https://example.com --extraction-type markdown --ai-targeted
```

## Bun usage

`extractPageWithScrapling()` validates the URL before launching the Python bridge. If extraction fails, it returns `null`, allowing the web search layer to fall back to the original search snippet.

```typescript
const extracted = await extractPageWithScrapling(result.url, {
  maxChars: 1200,
  timeoutMs: 15000,
  mode: "httpx",
  aiTargeted: true,
  extractionType: "text",
});
```

## Security and operations

- Only `http` and `https` URLs are accepted.
- Extraction errors are contained and do not leak raw bridge failures into the UI.
- Use `stealth` only for legitimate public information retrieval. Do not use it for authentication bypass, paywall bypass, or terms-of-service violations.
- For repeated access, respect the target site's terms, robots.txt, and rate limits.
- Keep AI context minimal with `--ai-targeted` and `maxChars`.

## Validation commands

Run these checks after modifying the integration:

```bash
python -m pytest tests/python/test_scrapling_bridge.py tests/python/test_scrapling_advanced.py -q
python -m ruff check python/lib/scrapling_bridge.py tests/python/test_scrapling_bridge.py tests/python/test_scrapling_advanced.py
bunx tsc --noEmit --pretty false
bun run security:glassworm -- --ci
```

The expected result is passing Python tests, no new TypeScript errors, and no blocking GlassWorm findings.
