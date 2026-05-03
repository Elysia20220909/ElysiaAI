#!/usr/bin/env python3
"""Bulk delete your own X/Twitter posts from a downloaded X archive.

The script is intentionally dry-run by default. It only calls the X delete API
when --execute is passed.

Typical flow:
  1. Create an X developer app with Read and write permissions enabled.
  2. Add this callback URL to the app: http://127.0.0.1:8765/callback
  3. OAuth 2.0 route:
       python scripts/x_bulk_delete_posts.py auth --client-id YOUR_CLIENT_ID
     OAuth 1.0a route:
       python scripts/x_bulk_delete_posts.py auth1
  4. Dry-run:
       python scripts/x_bulk_delete_posts.py delete twitter-archive.zip --before 2024-01-01
  5. Delete:
       python scripts/x_bulk_delete_posts.py delete twitter-archive.zip --before 2024-01-01 --execute
"""

from __future__ import annotations

import argparse
import base64
import dataclasses
import datetime as dt
import hashlib
import hmac
import http.server
import json
import os
import pathlib
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
import zipfile
from collections.abc import Iterable
from typing import Any


API_BASE = "https://api.x.com"
API_V1_BASE = "https://api.twitter.com"
AUTH_URL = "https://x.com/i/oauth2/authorize"
TOKEN_URL = f"{API_BASE}/2/oauth2/token"
OAUTH1_REQUEST_TOKEN_URL = f"{API_BASE}/oauth/request_token"
OAUTH1_AUTHORIZE_URL = f"{API_BASE}/oauth/authorize"
OAUTH1_ACCESS_TOKEN_URL = f"{API_BASE}/oauth/access_token"
DELETE_TWEET_URL = f"{API_BASE}/2/tweets/{{tweet_id}}"
DESTROY_STATUS_URL = f"{API_V1_BASE}/1.1/statuses/destroy/{{tweet_id}}.json"
DEFAULT_SCOPE = "tweet.read tweet.write users.read offline.access"
DEFAULT_TOKEN_FILE = pathlib.Path(".x_bulk_delete_tokens.json")
USER_AGENT = "x-bulk-delete-posts/1.0"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


@dataclasses.dataclass(frozen=True)
class ArchivePost:
    post_id: str
    created_at: dt.datetime | None
    text: str
    is_reply: bool
    is_retweet: bool
    source: str


@dataclasses.dataclass(frozen=True)
class ApiResult:
    status: int
    body: dict[str, Any]
    headers: dict[str, str]


@dataclasses.dataclass(frozen=True)
class AuthCredentials:
    auth_type: str
    access_token: str
    access_token_secret: str | None = None
    consumer_key: str | None = None
    consumer_secret: str | None = None


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def parse_twitter_date(value: str | None) -> dt.datetime | None:
    if not value:
        return None

    # Example: "Tue Mar 21 20:50:14 +0000 2006"
    parts = value.split()
    if len(parts) != 6:
        return None

    _, mon, day, hms, offset, year = parts
    month = MONTHS.get(mon)
    if month is None:
        return None

    try:
        hour, minute, second = [int(part) for part in hms.split(":")]
        sign = 1 if offset.startswith("+") else -1
        tz_hours = int(offset[1:3])
        tz_minutes = int(offset[3:5])
        timezone = dt.timezone(sign * dt.timedelta(hours=tz_hours, minutes=tz_minutes))
        return dt.datetime(
            int(year),
            month,
            int(day),
            hour,
            minute,
            second,
            tzinfo=timezone,
        )
    except (TypeError, ValueError):
        return None


def parse_boundary(value: str | None) -> dt.datetime | None:
    if not value:
        return None

    normalized = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
        normalized = f"{normalized}T00:00:00+00:00"
    elif normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"

    try:
        parsed = dt.datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise SystemExit(f"Invalid date/time: {value}") from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.UTC)
    return parsed


def read_text_from_zip(zip_path: pathlib.Path, name: str) -> str:
    with zipfile.ZipFile(zip_path) as archive:
        with archive.open(name) as handle:
            return handle.read().decode("utf-8-sig")


def iter_archive_sources(path: pathlib.Path) -> Iterable[tuple[str, str]]:
    if path.is_file() and path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                file_name = pathlib.PurePosixPath(name).name.lower()
                if is_tweet_archive_file(file_name):
                    yield name, read_text_from_zip(path, name)
        return

    if path.is_dir():
        for file_path in sorted(path.rglob("*.js")):
            if is_tweet_archive_file(file_path.name.lower()):
                yield str(file_path), file_path.read_text(encoding="utf-8-sig")
        return

    if path.is_file():
        yield str(path), path.read_text(encoding="utf-8-sig")
        return

    raise SystemExit(f"Archive path not found: {path}")


def is_tweet_archive_file(file_name: str) -> bool:
    if not file_name.endswith((".js", ".json")):
        return False
    if "deleted" in file_name:
        return False
    return file_name.startswith(("tweet", "tweets"))


def parse_js_archive_payload(text: str, source: str) -> list[dict[str, Any]]:
    payload = text.strip()
    if "=" in payload and payload.startswith("window."):
        payload = payload.split("=", 1)[1].strip()
    if payload.endswith(";"):
        payload = payload[:-1].strip()

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Could not parse archive JSON from {source}: {exc}") from exc

    if not isinstance(parsed, list):
        raise SystemExit(f"Archive file did not contain a list: {source}")
    return parsed


def post_from_archive_item(item: dict[str, Any], source: str) -> ArchivePost | None:
    tweet = item.get("tweet") if isinstance(item, dict) else None
    if not isinstance(tweet, dict):
        return None

    post_id = str(tweet.get("id_str") or tweet.get("id") or "").strip()
    if not post_id:
        return None

    text = str(tweet.get("full_text") or tweet.get("text") or "")
    created_at = parse_twitter_date(tweet.get("created_at"))
    is_reply = bool(tweet.get("in_reply_to_status_id") or tweet.get("in_reply_to_status_id_str"))
    is_retweet = bool(tweet.get("retweeted")) or text.startswith("RT @") or "retweeted_status" in tweet
    return ArchivePost(
        post_id=post_id,
        created_at=created_at,
        text=text,
        is_reply=is_reply,
        is_retweet=is_retweet,
        source=source,
    )


def load_archive_posts(path: pathlib.Path) -> list[ArchivePost]:
    posts: list[ArchivePost] = []
    seen: set[str] = set()

    for source, text in iter_archive_sources(path):
        for item in parse_js_archive_payload(text, source):
            post = post_from_archive_item(item, source)
            if post is None or post.post_id in seen:
                continue
            seen.add(post.post_id)
            posts.append(post)

    return posts


def matches_filters(post: ArchivePost, args: argparse.Namespace) -> bool:
    if args.before and (post.created_at is None or post.created_at >= args.before):
        return False
    if args.after and (post.created_at is None or post.created_at < args.after):
        return False
    if args.exclude_replies and post.is_reply:
        return False
    if args.only_replies and not post.is_reply:
        return False
    if args.exclude_retweets and post.is_retweet:
        return False
    if args.only_retweets and not post.is_retweet:
        return False

    haystack = post.text if args.case_sensitive else post.text.lower()
    for needle in args.contains:
        query = needle if args.case_sensitive else needle.lower()
        if query not in haystack:
            return False

    for pattern in args.regex:
        flags = 0 if args.case_sensitive else re.IGNORECASE
        if re.search(pattern, post.text, flags=flags) is None:
            return False

    return True


def filter_posts(posts: list[ArchivePost], args: argparse.Namespace) -> list[ArchivePost]:
    filtered = [post for post in posts if matches_filters(post, args)]
    filtered.sort(
        key=lambda post: post.created_at or dt.datetime.min.replace(tzinfo=dt.UTC),
        reverse=args.newest_first,
    )
    if args.limit is not None:
        filtered = filtered[: args.limit]
    return filtered


def summarize_text(text: str, max_len: int = 90) -> str:
    compact = " ".join(text.split())
    if len(compact) <= max_len:
        return compact
    return f"{compact[: max_len - 1]}..."


def print_preview(posts: list[ArchivePost], preview_count: int) -> None:
    for post in posts[:preview_count]:
        when = post.created_at.isoformat() if post.created_at else "unknown-date"
        print(f"- {post.post_id} {when} {summarize_text(post.text)}")
    if len(posts) > preview_count:
        print(f"... {len(posts) - preview_count} more")


def build_basic_auth_header(client_id: str, client_secret: str | None) -> str | None:
    if not client_secret:
        return None
    token = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode("ascii")
    return f"Basic {token}"


def oauth_quote(value: object) -> str:
    return urllib.parse.quote(str(value), safe="-._~")


def oauth_base_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme.lower()
    host = parsed.hostname.lower() if parsed.hostname else ""
    port = f":{parsed.port}" if parsed.port else ""
    if (scheme == "http" and parsed.port == 80) or (scheme == "https" and parsed.port == 443):
        port = ""
    return f"{scheme}://{host}{port}{parsed.path or '/'}"


def oauth_normalized_params(params: dict[str, str]) -> str:
    encoded = [(oauth_quote(key), oauth_quote(value)) for key, value in params.items()]
    encoded.sort()
    return "&".join(f"{key}={value}" for key, value in encoded)


def build_oauth1_authorization_header(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    token: str | None = None,
    token_secret: str | None = None,
    extra_oauth_params: dict[str, str] | None = None,
) -> str:
    oauth_params = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": secrets.token_urlsafe(24),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0",
    }
    if token:
        oauth_params["oauth_token"] = token
    if extra_oauth_params:
        oauth_params.update(extra_oauth_params)

    parsed = urllib.parse.urlparse(url)
    query_params = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    signature_params = {**query_params, **oauth_params}
    base_string = "&".join(
        [
            method.upper(),
            oauth_quote(oauth_base_url(url)),
            oauth_quote(oauth_normalized_params(signature_params)),
        ]
    )
    signing_key = f"{oauth_quote(consumer_secret)}&{oauth_quote(token_secret or '')}"
    digest = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    oauth_params["oauth_signature"] = base64.b64encode(digest).decode("ascii")

    header_params = ", ".join(
        f'{oauth_quote(key)}="{oauth_quote(value)}"'
        for key, value in sorted(oauth_params.items())
    )
    return f"OAuth {header_params}"


def oauth1_request(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    token: str | None = None,
    token_secret: str | None = None,
    extra_oauth_params: dict[str, str] | None = None,
) -> str:
    headers = {
        "Authorization": build_oauth1_authorization_header(
            method,
            url,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            token=token,
            token_secret=token_secret,
            extra_oauth_params=extra_oauth_params,
        ),
        "User-Agent": USER_AGENT,
    }
    data = b"" if method.upper() == "POST" else None
    request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"OAuth 1.0a request failed ({exc.code}): {body}") from exc


def parse_urlencoded_body(text: str) -> dict[str, str]:
    parsed = urllib.parse.parse_qs(text, keep_blank_values=True)
    return {key: values[0] for key, values in parsed.items() if values}


def form_request(
    url: str,
    form: dict[str, str],
    client_id: str,
    client_secret: str | None,
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
    }
    auth_header = build_basic_auth_header(client_id, client_secret)
    if auth_header:
        headers["Authorization"] = auth_header

    data = urllib.parse.urlencode(form).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Token request failed ({exc.code}): {body}") from exc


def save_tokens(token_file: pathlib.Path, tokens: dict[str, Any]) -> None:
    expires_in = int(tokens.get("expires_in") or 0)
    stored = {
        "auth_type": tokens.get("auth_type", "oauth2"),
        "access_token": tokens.get("access_token"),
        "access_token_secret": tokens.get("access_token_secret"),
        "refresh_token": tokens.get("refresh_token"),
        "expires_at": int(time.time()) + expires_in if expires_in else None,
        "scope": tokens.get("scope"),
        "token_type": tokens.get("token_type"),
        "user_id": tokens.get("user_id"),
        "screen_name": tokens.get("screen_name"),
        "consumer_key": tokens.get("consumer_key"),
        "consumer_secret": tokens.get("consumer_secret"),
    }
    token_file.write_text(json.dumps(stored, indent=2), encoding="utf-8")
    try:
        token_file.chmod(0o600)
    except OSError:
        pass


def load_tokens(token_file: pathlib.Path) -> dict[str, Any] | None:
    if not token_file.exists():
        return None
    return json.loads(token_file.read_text(encoding="utf-8"))


def refresh_access_token(
    token_file: pathlib.Path,
    tokens: dict[str, Any],
    client_id: str | None,
    client_secret: str | None,
) -> dict[str, Any]:
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        return tokens
    if not client_id:
        return tokens

    refreshed = form_request(
        TOKEN_URL,
        {
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "client_id": client_id,
        },
        client_id=client_id,
        client_secret=client_secret,
    )
    save_tokens(token_file, refreshed)
    print(f"Refreshed access token in {token_file}")
    return load_tokens(token_file) or refreshed


def require_oauth1_app_credentials(
    args: argparse.Namespace,
    tokens: dict[str, Any] | None = None,
) -> tuple[str, str]:
    api_key = args.api_key or os.environ.get("X_API_KEY") or (tokens or {}).get("consumer_key")
    api_key_secret = (
        args.api_key_secret
        or os.environ.get("X_API_KEY_SECRET")
        or (tokens or {}).get("consumer_secret")
    )
    if not api_key or not api_key_secret:
        raise SystemExit("OAuth 1.0a requires --api-key/--api-key-secret or env vars.")
    return api_key, api_key_secret


def resolve_auth(args: argparse.Namespace) -> AuthCredentials:
    if args.access_token:
        if args.access_token_secret:
            api_key, api_key_secret = require_oauth1_app_credentials(args)
            return AuthCredentials(
                auth_type="oauth1",
                access_token=args.access_token,
                access_token_secret=args.access_token_secret,
                consumer_key=api_key,
                consumer_secret=api_key_secret,
            )
        return AuthCredentials(auth_type="bearer", access_token=args.access_token)

    env_token = os.environ.get("X_USER_ACCESS_TOKEN")
    env_token_secret = os.environ.get("X_USER_ACCESS_TOKEN_SECRET")
    if env_token:
        if env_token_secret:
            api_key, api_key_secret = require_oauth1_app_credentials(args)
            return AuthCredentials(
                auth_type="oauth1",
                access_token=env_token,
                access_token_secret=env_token_secret,
                consumer_key=api_key,
                consumer_secret=api_key_secret,
            )
        return AuthCredentials(auth_type="bearer", access_token=env_token)

    tokens = load_tokens(args.token_file)
    if not tokens:
        raise SystemExit(
            "No token found. Run auth/auth1 first, or set X_USER_ACCESS_TOKEN."
        )

    if tokens.get("auth_type") == "oauth1" or tokens.get("access_token_secret"):
        api_key, api_key_secret = require_oauth1_app_credentials(args, tokens)
        access_token = tokens.get("access_token")
        access_token_secret = tokens.get("access_token_secret")
        if not access_token or not access_token_secret:
            raise SystemExit("OAuth 1.0a token file is missing access token data.")
        return AuthCredentials(
            auth_type="oauth1",
            access_token=str(access_token),
            access_token_secret=str(access_token_secret),
            consumer_key=api_key,
            consumer_secret=api_key_secret,
        )

    expires_at = tokens.get("expires_at")
    if expires_at and int(expires_at) <= int(time.time()) + 120:
        tokens = refresh_access_token(
            args.token_file,
            tokens,
            args.client_id,
            args.client_secret,
        )

    access_token = tokens.get("access_token")
    if not access_token:
        raise SystemExit("Token file did not contain access_token.")
    return AuthCredentials(auth_type="bearer", access_token=str(access_token))


def refresh_bearer_auth_if_needed(
    args: argparse.Namespace,
    auth: AuthCredentials,
    *,
    force: bool = False,
) -> AuthCredentials:
    if auth.auth_type != "bearer":
        return auth

    tokens = load_tokens(args.token_file)
    if not tokens or not tokens.get("refresh_token"):
        return auth

    expires_at = tokens.get("expires_at")
    should_refresh = force
    if expires_at:
        should_refresh = should_refresh or int(expires_at) <= int(time.time()) + 300

    if not should_refresh:
        return auth

    if not args.client_id:
        return auth

    refresh_access_token(
        args.token_file,
        tokens,
        args.client_id,
        args.client_secret,
    )
    return resolve_auth(args)


class OAuthCallbackHandler(http.server.BaseHTTPRequestHandler):
    result: dict[str, str] = {}
    expected_path = "/callback"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != self.expected_path:
            self.send_response(404)
            self.end_headers()
            return

        query = urllib.parse.parse_qs(parsed.query)
        for key in (
            "code",
            "state",
            "error",
            "error_description",
            "oauth_token",
            "oauth_verifier",
            "denied",
        ):
            if key in query and query[key]:
                self.result[key] = query[key][0]

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"X authorization complete. You can close this tab.")

    def log_message(self, format: str, *args: Any) -> None:
        return


def run_auth(args: argparse.Namespace) -> int:
    client_id = args.client_id or os.environ.get("X_CLIENT_ID")
    client_secret = args.client_secret or os.environ.get("X_CLIENT_SECRET")
    if not client_id:
        raise SystemExit("Missing --client-id or X_CLIENT_ID.")

    redirect = urllib.parse.urlparse(args.redirect_uri)
    if redirect.scheme != "http" or redirect.hostname not in {"127.0.0.1", "localhost"}:
        raise SystemExit("Use a local redirect URI like http://127.0.0.1:8765/callback")

    code_verifier = b64url(secrets.token_bytes(64))
    code_challenge = b64url(hashlib.sha256(code_verifier.encode("ascii")).digest())
    state = secrets.token_urlsafe(24)
    query = urllib.parse.urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": args.redirect_uri,
            "scope": args.scope,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        },
        quote_via=urllib.parse.quote,
    )
    authorize_url = f"{AUTH_URL}?{query}"

    OAuthCallbackHandler.result = {}
    OAuthCallbackHandler.expected_path = redirect.path or "/callback"
    port = redirect.port or 80
    host = redirect.hostname or "127.0.0.1"

    print("Opening browser for X authorization...")
    print(authorize_url)
    webbrowser.open(authorize_url)

    with http.server.HTTPServer((host, port), OAuthCallbackHandler) as server:
        server.timeout = args.timeout
        server.handle_request()

    result = OAuthCallbackHandler.result
    if not result:
        raise SystemExit("Timed out waiting for OAuth callback.")
    if result.get("error"):
        raise SystemExit(
            f"Authorization failed: {result.get('error')} {result.get('error_description', '')}"
        )
    if result.get("state") != state:
        raise SystemExit("OAuth state mismatch.")

    tokens = form_request(
        TOKEN_URL,
        {
            "code": result["code"],
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": args.redirect_uri,
            "code_verifier": code_verifier,
        },
        client_id=client_id,
        client_secret=client_secret,
    )
    save_tokens(args.token_file, tokens)
    print(f"Saved token file: {args.token_file}")
    return 0


def run_auth_oauth1(args: argparse.Namespace) -> int:
    api_key, api_key_secret = require_oauth1_app_credentials(args)
    redirect = urllib.parse.urlparse(args.redirect_uri)
    if redirect.scheme != "http" or redirect.hostname not in {"127.0.0.1", "localhost"}:
        raise SystemExit("Use a local redirect URI like http://127.0.0.1:8765/callback")

    request_token_body = oauth1_request(
        "POST",
        OAUTH1_REQUEST_TOKEN_URL,
        consumer_key=api_key,
        consumer_secret=api_key_secret,
        extra_oauth_params={"oauth_callback": args.redirect_uri},
    )
    request_token = parse_urlencoded_body(request_token_body)
    oauth_token = request_token.get("oauth_token")
    oauth_token_secret = request_token.get("oauth_token_secret")
    if not oauth_token or not oauth_token_secret:
        raise SystemExit(f"Could not obtain request token: {request_token_body}")

    authorize_url = f"{OAUTH1_AUTHORIZE_URL}?{urllib.parse.urlencode({'oauth_token': oauth_token})}"
    OAuthCallbackHandler.result = {}
    OAuthCallbackHandler.expected_path = redirect.path or "/callback"
    port = redirect.port or 80
    host = redirect.hostname or "127.0.0.1"

    print("Opening browser for X authorization...")
    print(authorize_url)
    webbrowser.open(authorize_url)

    with http.server.HTTPServer((host, port), OAuthCallbackHandler) as server:
        server.timeout = args.timeout
        server.handle_request()

    result = OAuthCallbackHandler.result
    if not result:
        raise SystemExit("Timed out waiting for OAuth callback.")
    if result.get("denied"):
        raise SystemExit("Authorization was denied.")
    if result.get("oauth_token") != oauth_token:
        raise SystemExit("OAuth token mismatch.")
    verifier = result.get("oauth_verifier")
    if not verifier:
        raise SystemExit("OAuth callback did not include oauth_verifier.")

    access_token_body = oauth1_request(
        "POST",
        OAUTH1_ACCESS_TOKEN_URL,
        consumer_key=api_key,
        consumer_secret=api_key_secret,
        token=oauth_token,
        token_secret=oauth_token_secret,
        extra_oauth_params={"oauth_verifier": verifier},
    )
    access = parse_urlencoded_body(access_token_body)
    if not access.get("oauth_token") or not access.get("oauth_token_secret"):
        raise SystemExit(f"Could not obtain access token: {access_token_body}")

    save_tokens(
        args.token_file,
        {
            "auth_type": "oauth1",
            "access_token": access.get("oauth_token"),
            "access_token_secret": access.get("oauth_token_secret"),
            "token_type": "oauth1",
            "user_id": access.get("user_id"),
            "screen_name": access.get("screen_name"),
            "consumer_key": api_key,
            "consumer_secret": api_key_secret,
        },
    )
    screen_name = access.get("screen_name", "unknown")
    print(f"Saved OAuth 1.0a token for @{screen_name}: {args.token_file}")
    return 0


def api_request(method: str, url: str, auth: AuthCredentials) -> ApiResult:
    if auth.auth_type == "oauth1":
        if not auth.consumer_key or not auth.consumer_secret or not auth.access_token_secret:
            raise SystemExit("OAuth 1.0a credentials are incomplete.")
        authorization = build_oauth1_authorization_header(
            method,
            url,
            consumer_key=auth.consumer_key,
            consumer_secret=auth.consumer_secret,
            token=auth.access_token,
            token_secret=auth.access_token_secret,
        )
    else:
        authorization = f"Bearer {auth.access_token}"

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": authorization,
            "User-Agent": USER_AGENT,
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            body = json.loads(raw) if raw else {}
            headers = {key.lower(): value for key, value in response.headers.items()}
            return ApiResult(response.status, body, headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw}
        headers = {key.lower(): value for key, value in exc.headers.items()}
        return ApiResult(exc.code, body, headers)


def wait_for_retry(result: ApiResult, fallback_seconds: float) -> None:
    retry_after = result.headers.get("retry-after")
    if retry_after:
        try:
            wait_seconds = float(retry_after)
            print(f"Rate limited. Waiting {wait_seconds:.1f}s...")
            time.sleep(wait_seconds)
            return
        except ValueError:
            pass

    reset = result.headers.get("x-rate-limit-reset")
    if reset:
        try:
            wait_seconds = max(0.0, float(reset) - time.time()) + 1.0
            print(f"Rate limited. Waiting {wait_seconds:.1f}s...")
            time.sleep(wait_seconds)
            return
        except ValueError:
            pass

    print(f"Temporary failure. Waiting {fallback_seconds:.1f}s...")
    time.sleep(fallback_seconds)


def delete_post(
    tweet_id: str,
    auth: AuthCredentials,
    max_retries: int,
    api_version: str,
) -> ApiResult:
    if api_version == "v1.1":
        url = DESTROY_STATUS_URL.format(tweet_id=urllib.parse.quote(tweet_id, safe=""))
        method = "POST"
    else:
        url = DELETE_TWEET_URL.format(tweet_id=urllib.parse.quote(tweet_id, safe=""))
        method = "DELETE"

    retryable = {429, 500, 502, 503, 504}
    for attempt in range(max_retries + 1):
        result = api_request(method, url, auth)
        if result.status not in retryable or attempt >= max_retries:
            return result
        wait_for_retry(result, fallback_seconds=min(60.0, 2.0 * (attempt + 1)))
    return result


def confirm_execute(posts: list[ArchivePost]) -> None:
    expected = f"DELETE {len(posts)}"
    print()
    print(f"About to delete {len(posts)} posts.")
    print(f'Type "{expected}" to continue: ', end="")
    entered = input().strip()
    if entered != expected:
        raise SystemExit("Cancelled.")


def write_log(log_file: pathlib.Path | None, payload: dict[str, Any]) -> None:
    if log_file is None:
        return
    with log_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def run_delete(args: argparse.Namespace) -> int:
    args.before = parse_boundary(args.before)
    args.after = parse_boundary(args.after)

    all_posts = load_archive_posts(args.archive)
    posts = filter_posts(all_posts, args)

    print(f"Loaded posts: {len(all_posts)}")
    print(f"Matched posts: {len(posts)}")
    print_preview(posts, args.preview)

    if not posts:
        return 0

    if not args.execute:
        print()
        print("Dry run only. Add --execute to delete matched posts.")
        return 0

    if not args.yes:
        confirm_execute(posts)

    auth = resolve_auth(args)
    api_version = args.api_version
    if api_version == "auto":
        api_version = "v1.1" if auth.auth_type == "oauth1" else "v2"
    if api_version == "v1.1" and auth.auth_type != "oauth1":
        raise SystemExit("API v1.1 deletion requires OAuth 1.0a credentials.")

    ok = 0
    failed = 0
    started = dt.datetime.now(tz=dt.UTC).isoformat()

    for index, post in enumerate(posts, start=1):
        auth = refresh_bearer_auth_if_needed(args, auth)
        result = delete_post(post.post_id, auth, args.max_retries, api_version)
        if result.status == 401 and api_version == "v2":
            auth = refresh_bearer_auth_if_needed(args, auth, force=True)
            result = delete_post(post.post_id, auth, args.max_retries, api_version)

        if api_version == "v1.1":
            deleted = result.status == 200 and str(result.body.get("id_str", "")) == post.post_id
        else:
            deleted = result.status == 200 and bool(result.body.get("data", {}).get("deleted"))
        if deleted:
            ok += 1
            status_label = "deleted"
        else:
            failed += 1
            status_label = f"failed:{result.status}"

        print(f"[{index}/{len(posts)}] {post.post_id} {status_label}")
        write_log(
            args.log_file,
            {
                "time": dt.datetime.now(tz=dt.UTC).isoformat(),
                "post_id": post.post_id,
                "created_at": post.created_at.isoformat() if post.created_at else None,
                "status": result.status,
                "deleted": deleted,
                "response": result.body,
            },
        )
        if index < len(posts) and args.sleep > 0:
            time.sleep(args.sleep)

    print()
    print(f"Started: {started}")
    print(f"Deleted: {ok}")
    print(f"Failed: {failed}")
    if failed:
        print("Check the response body in --log-file output, if you enabled it.")
    return 1 if failed else 0


def add_shared_auth_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--client-id", default=os.environ.get("X_CLIENT_ID"))
    parser.add_argument("--client-secret", default=os.environ.get("X_CLIENT_SECRET"))
    parser.add_argument("--token-file", type=pathlib.Path, default=DEFAULT_TOKEN_FILE)


def add_shared_oauth1_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--api-key", default=os.environ.get("X_API_KEY"))
    parser.add_argument("--api-key-secret", default=os.environ.get("X_API_KEY_SECRET"))
    parser.add_argument("--token-file", type=pathlib.Path, default=DEFAULT_TOKEN_FILE)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Bulk delete your own X/Twitter posts from an X archive."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    auth = subparsers.add_parser("auth", help="Create an OAuth 2.0 user token.")
    add_shared_auth_args(auth)
    auth.add_argument("--redirect-uri", default="http://127.0.0.1:8765/callback")
    auth.add_argument("--scope", default=DEFAULT_SCOPE)
    auth.add_argument("--timeout", type=int, default=180)
    auth.set_defaults(func=run_auth)

    auth1 = subparsers.add_parser(
        "auth1",
        help="Create an OAuth 1.0a user token from API Key/Secret.",
    )
    add_shared_oauth1_args(auth1)
    auth1.add_argument("--redirect-uri", default="http://127.0.0.1:8765/callback")
    auth1.add_argument("--timeout", type=int, default=180)
    auth1.set_defaults(func=run_auth_oauth1)

    delete = subparsers.add_parser("delete", help="Dry-run or delete posts.")
    add_shared_auth_args(delete)
    delete.add_argument("--api-key", default=os.environ.get("X_API_KEY"))
    delete.add_argument("--api-key-secret", default=os.environ.get("X_API_KEY_SECRET"))
    delete.add_argument("archive", type=pathlib.Path, help="X archive .zip, extracted dir, or tweets.js")
    delete.add_argument("--access-token", default=None, help="OAuth 2.0 user access token.")
    delete.add_argument("--access-token-secret", default=None, help="OAuth 1.0a user token secret.")
    delete.add_argument(
        "--api-version",
        choices=["auto", "v2", "v1.1"],
        default="auto",
        help="Delete API to use. auto uses v1.1 for OAuth 1.0a and v2 for OAuth 2.0.",
    )
    delete.add_argument("--before", help="Only posts before this UTC date/time, e.g. 2024-01-01")
    delete.add_argument("--after", help="Only posts after this UTC date/time, e.g. 2020-01-01")
    delete.add_argument("--contains", action="append", default=[], help="Text that must be present.")
    delete.add_argument("--regex", action="append", default=[], help="Regex that must match.")
    delete.add_argument("--case-sensitive", action="store_true")
    delete.add_argument("--exclude-replies", action="store_true")
    delete.add_argument("--only-replies", action="store_true")
    delete.add_argument("--exclude-retweets", action="store_true")
    delete.add_argument("--only-retweets", action="store_true")
    delete.add_argument("--newest-first", action="store_true")
    delete.add_argument("--limit", type=int)
    delete.add_argument("--preview", type=int, default=20)
    delete.add_argument("--execute", action="store_true")
    delete.add_argument("--yes", action="store_true", help="Skip the DELETE N confirmation prompt.")
    delete.add_argument("--sleep", type=float, default=1.2, help="Seconds between delete calls.")
    delete.add_argument("--max-retries", type=int, default=3)
    delete.add_argument("--log-file", type=pathlib.Path)
    delete.set_defaults(func=run_delete)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
