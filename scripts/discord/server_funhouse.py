import argparse
import datetime as dt
import hashlib
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


API_BASE = "https://discord.com/api/v10"
DEFAULT_GUILD_ID = "695637918626218044"
DEFAULT_ADMIN_USER_ID = "166066635214422016"
FUN_CHANNEL_NAME = "elysia-lab"
FUN_ROLE_NAME = "Starlight Admin"
SILVERWOLF_CHANNEL_NAME = "silverwolf-lv999"
SILVERWOLF_ROLE_NAME = "Silver Wolf Lv.999"
ABYSS_CHANNEL_NAME = "elysia-abyss-collab"
ABYSS_ROLE_NAME = "ElysiaAI Abyss Lv.999"
ABYSS_PROTOCOL_SERVER_NAME = "〔 ᴀʙʏss_ᴘʀᴏᴛᴏᴄᴏʟ_999 〕"
ABYSS_PROTOCOL_CATEGORY_NAME = "▬▬▬ 深淵領域: ABYSS ▬▬▬"
ABYSS_PROTOCOL_ROLE_NAME = "Abyss Protocol Lv.999"
ABYSS_PROTOCOL_CHANNELS = [
    (
        "abyss-command",
        "Abyss Protocol Lv.999 command deck: consent-first server styling, no destructive actions.",
    ),
    (
        "abyss-signal",
        "Abyss Protocol signal relay: announcements, status pulses, and lore drops.",
    ),
    (
        "abyss-archive",
        "Abyss Protocol archive: builds, screenshots, and artifacts worth preserving.",
    ),
]

PERMISSIONS = {
    "administrator": 0x8,
    "manage_channels": 0x10,
    "manage_guild": 0x20,
    "send_messages": 0x800,
    "embed_links": 0x4000,
    "manage_roles": 0x10000000,
}

VIBES = [
    "quiet command room",
    "tiny private moonbase",
    "overclocked tea party",
    "two-person raid lobby",
    "rainproof archive",
    "midnight control panel",
]

PROMPTS = [
    "Today, post one thing worth saving before it disappears.",
    "Name the current server arc in five words or less.",
    "Pick a channel and give it a tiny mission for the day.",
    "Share one build, one screenshot, or one strange idea.",
    "Make one thing easier to find for future-you.",
]


class DiscordApiError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Safe Discord funhouse for a server you administer. Dry-run by default."
    )
    parser.add_argument("--guild-id", default=DEFAULT_GUILD_ID)
    parser.add_argument("--admin-user-id", default=DEFAULT_ADMIN_USER_ID)
    parser.add_argument(
        "--action",
        choices=[
            "inspect",
            "plan",
            "post-pulse",
            "make-lab",
            "crown-admin",
            "silverwolf",
            "abyss-collab",
            "abyss-overdrive",
            "all",
        ],
        default="inspect",
    )
    parser.add_argument(
        "--channel-id",
        help="Text channel for post-pulse. If omitted with --auto-channel, a text channel is chosen.",
    )
    parser.add_argument(
        "--auto-channel",
        action="store_true",
        help="Choose a text channel automatically for post-pulse.",
    )
    parser.add_argument("--apply", action="store_true", help="Actually perform the selected action.")
    parser.add_argument("--seed", help="Optional seed for repeatable generated text.")
    return parser.parse_args()


def load_local_env() -> None:
    env_paths = [Path.cwd() / ".env", Path(__file__).resolve().parents[2] / ".env"]
    for env_path in env_paths:
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        return


def get_bot_token() -> str:
    load_local_env()
    token = os.getenv("DISCORD_BOT_TOKEN", "").strip().strip('"').strip("'")
    if not token:
        raise SystemExit("[!] DISCORD_BOT_TOKEN is missing in .env")
    return token


def request_json(
    headers: dict[str, str],
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
) -> Any:
    url = f"{API_BASE}{path}"
    for attempt in range(3):
        request_headers = dict(headers)
        data = None
        if json_body is not None:
            request_headers["Content-Type"] = "application/json"
            data = json.dumps(json_body).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
                if not content:
                    return None
                return json.loads(content.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body_bytes = exc.read()
            body_text = body_bytes.decode("utf-8", errors="replace") if body_bytes else ""
            if exc.code == 429 and attempt < 2:
                try:
                    retry_after = json.loads(body_text).get("retry_after", 1.5)
                except json.JSONDecodeError:
                    retry_after = 1.5
                time.sleep(float(retry_after) + 0.25)
                continue
            body = body_text[:500].replace("\n", " ")
            raise DiscordApiError(f"{method} {path} failed: HTTP {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise DiscordApiError(f"{method} {path} failed: {exc.reason}") from exc
    raise DiscordApiError(f"{method} {path} failed after retries")


def permission_value(role: dict[str, Any]) -> int:
    return int(role.get("permissions") or 0)


def has_permission(permission_bits: int, name: str) -> bool:
    return bool(permission_bits & PERMISSIONS["administrator"]) or bool(
        permission_bits & PERMISSIONS[name]
    )


def merged_permissions(member: dict[str, Any], roles: list[dict[str, Any]], guild_id: str) -> int:
    by_id = {str(role["id"]): role for role in roles}
    permissions = permission_value(by_id.get(guild_id, {}))
    for role_id in member.get("roles", []):
        role = by_id.get(str(role_id))
        if role:
            permissions |= permission_value(role)
    return permissions


def admin_status(
    guild: dict[str, Any],
    member: dict[str, Any],
    roles: list[dict[str, Any]],
    user_id: str,
) -> tuple[bool, list[str]]:
    if str(guild.get("owner_id")) == str(user_id):
        return True, ["server owner"]

    by_id = {str(role["id"]): role for role in roles}
    admin_roles = []
    for role_id in member.get("roles", []):
        role = by_id.get(str(role_id))
        if role and permission_value(role) & PERMISSIONS["administrator"]:
            admin_roles.append(str(role.get("name") or role_id))
    return bool(admin_roles), admin_roles


def stable_rng(guild_id: str, seed: str | None) -> random.Random:
    seed_text = seed or f"{guild_id}:{dt.datetime.now(dt.timezone.utc):%Y-%m-%d}"
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:12], 16))


def text_channels(channels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [channel for channel in channels if int(channel.get("type", -1)) in {0, 5}],
        key=lambda channel: int(channel.get("position", 0)),
    )


def pick_channel(channels: list[dict[str, Any]], preferred_id: str | None, auto: bool) -> dict[str, Any] | None:
    if preferred_id:
        return next((channel for channel in channels if str(channel.get("id")) == preferred_id), None)
    if not auto:
        return None
    candidates = text_channels(channels)
    for name in ("雑談", "general", "chat", "elysia-lab"):
        found = next((channel for channel in candidates if str(channel.get("name")) == name), None)
        if found:
            return found
    return candidates[0] if candidates else None


def build_pulse_embed(guild: dict[str, Any], channels: list[dict[str, Any]], roles: list[dict[str, Any]], rng: random.Random) -> dict[str, Any]:
    text_count = len(text_channels(channels))
    role_count = len([role for role in roles if role.get("name") != "@everyone"])
    members = guild.get("approximate_member_count", "unknown")
    online = guild.get("approximate_presence_count", "unknown")
    chaos = min(99, 20 + text_count * 7 + role_count * 5 + rng.randint(0, 22))
    vibe = rng.choice(VIBES)
    prompt = rng.choice(PROMPTS)

    return {
        "title": f"Funhouse Pulse // {guild.get('name')}",
        "description": f"Mode: `{vibe}`\nChaos: `{chaos}/99`\nPrompt: **{prompt}**",
        "color": 0x22C55E,
        "fields": [
            {
                "name": "Snapshot",
                "value": f"Members: `{members}`\nOnline-ish: `{online}`\nText channels: `{text_count}`",
                "inline": True,
            },
            {
                "name": "Safe Mode",
                "value": "No deletes. No bans. No permission escalation.",
                "inline": True,
            },
        ],
        "footer": {"text": "Generated by Elysia funhouse"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def print_summary(
    guild: dict[str, Any],
    target_member: dict[str, Any],
    target_is_admin: bool,
    target_admin_sources: list[str],
    bot_permissions: int,
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
) -> None:
    print("=====================================================")
    print("   ELYSIA DISCORD FUNHOUSE")
    print("=====================================================")
    print(f"Guild: {guild.get('name')} ({guild.get('id')})")
    print(f"Owner: {guild.get('owner_id')}")
    print(f"Members: {guild.get('approximate_member_count', 'unknown')}")
    print(f"Target user: {target_member.get('user', {}).get('username')} ({target_member.get('user', {}).get('id')})")
    print(f"Target has administrator: {target_is_admin} via {', '.join(target_admin_sources) or 'none'}")
    print(f"Text channels: {len(text_channels(channels))}")
    print(f"Visible roles: {len([role for role in roles if role.get('name') != '@everyone'])}")
    print("")
    print("Bot capabilities in this guild:")
    for name in ("manage_channels", "manage_guild", "send_messages", "embed_links", "manage_roles"):
        print(f"  {name}: {has_permission(bot_permissions, name)}")


def ensure_authorized(target_is_admin: bool) -> None:
    if not target_is_admin:
        raise SystemExit("[!] Target user is not the owner/admin according to the bot-visible role data.")


def dry_run_or_apply(apply: bool, description: str) -> bool:
    if not apply:
        print(f"[dry-run] {description}")
        return False
    print(f"[*] {description}")
    return True


def ensure_lab_channel(
    headers: dict[str, str],
    guild_id: str,
    channels: list[dict[str, Any]],
    apply: bool,
) -> dict[str, Any] | None:
    existing = next((channel for channel in channels if channel.get("name") == FUN_CHANNEL_NAME), None)
    topic = "Elysia lab: safe experiments, tiny quests, no chaos without consent."

    if existing:
        if dry_run_or_apply(apply, f"Update topic for #{FUN_CHANNEL_NAME}"):
            request_json(
                headers,
                "PATCH",
                f"/channels/{existing['id']}",
                json_body={"topic": topic},
            )
        return existing

    if dry_run_or_apply(apply, f"Create text channel #{FUN_CHANNEL_NAME}"):
        return request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/channels",
            json_body={"name": FUN_CHANNEL_NAME, "type": 0, "topic": topic},
        )
    return None


def post_pulse(
    headers: dict[str, str],
    guild: dict[str, Any],
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
    channel: dict[str, Any] | None,
    rng: random.Random,
    apply: bool,
) -> None:
    if not channel:
        print("[!] No post channel selected. Use --channel-id CHANNEL_ID or --auto-channel.")
        return

    description = f"Post one fun pulse embed to #{channel.get('name')} ({channel.get('id')})"
    if dry_run_or_apply(apply, description):
        payload = {
            "content": "",
            "embeds": [build_pulse_embed(guild, channels, roles, rng)],
            "allowed_mentions": {"parse": []},
        }
        request_json(headers, "POST", f"/channels/{channel['id']}/messages", json_body=payload)
        print("[+] Posted.")


def crown_admin(
    headers: dict[str, str],
    guild_id: str,
    user_id: str,
    roles: list[dict[str, Any]],
    apply: bool,
) -> None:
    role = next((item for item in roles if item.get("name") == FUN_ROLE_NAME), None)
    if not role:
        if dry_run_or_apply(apply, f"Create cosmetic role @{FUN_ROLE_NAME} with no permissions"):
            role = request_json(
                headers,
                "POST",
                f"/guilds/{guild_id}/roles",
                json_body={
                    "name": FUN_ROLE_NAME,
                    "permissions": "0",
                    "color": 0xF59E0B,
                    "hoist": False,
                    "mentionable": False,
                },
            )
    else:
        print(f"[*] Role @{FUN_ROLE_NAME} already exists ({role.get('id')}).")

    if role and dry_run_or_apply(apply, f"Assign @{FUN_ROLE_NAME} to user {user_id}"):
        request_json(headers, "PUT", f"/guilds/{guild_id}/members/{user_id}/roles/{role['id']}")
        print("[+] Role assigned.")


def build_silverwolf_embed(guild: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    packet_id = hashlib.sha1(
        f"{guild.get('id')}:{dt.datetime.now(dt.timezone.utc):%Y%m%d}".encode("utf-8")
    ).hexdigest()[:8].upper()
    fake_nodes = rng.sample(
        [
            "AETHER-GATE",
            "MOONCACHE",
            "NEON-ROOT",
            "ELYSIA-KERNEL",
            "STARPORT-09",
            "RAIN-SHELL",
        ],
        3,
    )

    return {
        "title": "Silver Wolf Lv.999 // Access Granted",
        "description": (
            "```ansi\n"
            "\u001b[2;36m> boot silverwolf_lv999.exe\u001b[0m\n"
            "\u001b[2;35m> style payload injected: neon / glitch / playful\u001b[0m\n"
            "\u001b[2;32m> server integrity: untouched\u001b[0m\n"
            "```\n"
            "雰囲気だけハッカー。実害ゼロ、演出だけ最大出力。"
        ),
        "color": 0xA855F7,
        "fields": [
            {
                "name": "Target",
                "value": f"`{guild.get('name')}`\nPacket `{packet_id}`",
                "inline": True,
            },
            {
                "name": "Linked Nodes",
                "value": "\n".join(f"`{node}`" for node in fake_nodes),
                "inline": True,
            },
            {
                "name": "Lv.999 Rule",
                "value": "No deletes. No bans. No permission escalation. Only style.",
                "inline": False,
            },
        ],
        "footer": {"text": "Silver Wolf style operation completed by Elysia Funhouse"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def run_silverwolf_operation(
    headers: dict[str, str],
    guild: dict[str, Any],
    guild_id: str,
    user_id: str,
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
    rng: random.Random,
    apply: bool,
) -> None:
    channel = next(
        (item for item in channels if item.get("name") == SILVERWOLF_CHANNEL_NAME),
        None,
    )
    topic = "Silver Wolf Lv.999 terminal: neon-glitch roleplay, safe-mode locked."
    if channel:
        if dry_run_or_apply(apply, f"Update topic for #{SILVERWOLF_CHANNEL_NAME}"):
            request_json(
                headers,
                "PATCH",
                f"/channels/{channel['id']}",
                json_body={"topic": topic},
            )
    elif dry_run_or_apply(apply, f"Create text channel #{SILVERWOLF_CHANNEL_NAME}"):
        channel = request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/channels",
            json_body={"name": SILVERWOLF_CHANNEL_NAME, "type": 0, "topic": topic},
        )

    role = next((item for item in roles if item.get("name") == SILVERWOLF_ROLE_NAME), None)
    if not role:
        if dry_run_or_apply(apply, f"Create cosmetic role @{SILVERWOLF_ROLE_NAME}"):
            role = request_json(
                headers,
                "POST",
                f"/guilds/{guild_id}/roles",
                json_body={
                    "name": SILVERWOLF_ROLE_NAME,
                    "permissions": "0",
                    "color": 0x7C3AED,
                    "hoist": False,
                    "mentionable": False,
                },
            )
    else:
        print(f"[*] Role @{SILVERWOLF_ROLE_NAME} already exists ({role.get('id')}).")

    if role and dry_run_or_apply(apply, f"Assign @{SILVERWOLF_ROLE_NAME} to user {user_id}"):
        request_json(headers, "PUT", f"/guilds/{guild_id}/members/{user_id}/roles/{role['id']}")
        print("[+] Silver Wolf role assigned.")

    if channel and dry_run_or_apply(apply, f"Post Silver Wolf Lv.999 embed to #{channel.get('name')}"):
        payload = {
            "content": "",
            "embeds": [build_silverwolf_embed(guild, rng)],
            "allowed_mentions": {"parse": []},
        }
        request_json(headers, "POST", f"/channels/{channel['id']}/messages", json_body=payload)
        print("[+] Silver Wolf Lv.999 operation posted.")


def build_abyss_collab_embed(guild: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    abyss_key = hashlib.sha256(
        f"elysia-abyss:{guild.get('id')}:{dt.datetime.now(dt.timezone.utc):%Y%m%d}".encode(
            "utf-8"
        )
    ).hexdigest()[:10].upper()
    phases = rng.sample(
        [
            "RESONANCE_CORE",
            "ABYSS_GATE",
            "SILVER_PACKET",
            "ELYSIA_KERNEL",
            "NOIR_TERMINAL",
            "LV999_SIGNAL",
            "DREAMCACHE",
        ],
        4,
    )

    return {
        "title": "ElysiaAI x Silver Wolf Lv.999 // Abyss Collaboration",
        "description": (
            "```ansi\n"
            "\u001b[2;36m> connect elysia_ai --collab silverwolf_lv999\u001b[0m\n"
            "\u001b[2;35m> abyss_level: MAX_VISUAL_OUTPUT\u001b[0m\n"
            "\u001b[2;32m> damage_mode: ZERO_REAL_WORLD_EFFECT\u001b[0m\n"
            "\u001b[2;33m> status: collaboration ritual armed\u001b[0m\n"
            "```\n"
            "深淵レベルの演出だけ起動。サーバーの中身は守ったまま、見た目だけ限界突破。"
        ),
        "color": 0x06B6D4,
        "fields": [
            {
                "name": "Abyss Key",
                "value": f"`{abyss_key}`",
                "inline": True,
            },
            {
                "name": "Collab Stack",
                "value": "`ElysiaAI`\n`Silver Wolf Lv.999`\n`Glitch World 999`",
                "inline": True,
            },
            {
                "name": "Active Phases",
                "value": "\n".join(f"`{phase}`" for phase in phases),
                "inline": False,
            },
            {
                "name": "Safety Lock",
                "value": "No deletes. No bans. No permission escalation. One theatrical pulse only.",
                "inline": False,
            },
        ],
        "footer": {"text": "Abyss collaboration executed by Elysia Funhouse"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def run_abyss_collab_operation(
    headers: dict[str, str],
    guild: dict[str, Any],
    guild_id: str,
    user_id: str,
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
    rng: random.Random,
    apply: bool,
) -> None:
    channel = next((item for item in channels if item.get("name") == ABYSS_CHANNEL_NAME), None)
    topic = "ElysiaAI x Silver Wolf Lv.999: abyss-level collaboration terminal, safe-mode sealed."
    if channel:
        if dry_run_or_apply(apply, f"Update topic for #{ABYSS_CHANNEL_NAME}"):
            request_json(
                headers,
                "PATCH",
                f"/channels/{channel['id']}",
                json_body={"topic": topic},
            )
    elif dry_run_or_apply(apply, f"Create text channel #{ABYSS_CHANNEL_NAME}"):
        channel = request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/channels",
            json_body={"name": ABYSS_CHANNEL_NAME, "type": 0, "topic": topic},
        )

    role = next((item for item in roles if item.get("name") == ABYSS_ROLE_NAME), None)
    if not role:
        if dry_run_or_apply(apply, f"Create cosmetic role @{ABYSS_ROLE_NAME}"):
            role = request_json(
                headers,
                "POST",
                f"/guilds/{guild_id}/roles",
                json_body={
                    "name": ABYSS_ROLE_NAME,
                    "permissions": "0",
                    "color": 0x0891B2,
                    "hoist": False,
                    "mentionable": False,
                },
            )
    else:
        print(f"[*] Role @{ABYSS_ROLE_NAME} already exists ({role.get('id')}).")

    if role and dry_run_or_apply(apply, f"Assign @{ABYSS_ROLE_NAME} to user {user_id}"):
        request_json(headers, "PUT", f"/guilds/{guild_id}/members/{user_id}/roles/{role['id']}")
        print("[+] Abyss collaboration role assigned.")

    if channel and dry_run_or_apply(apply, f"Post ElysiaAI abyss collab embed to #{channel.get('name')}"):
        payload = {
            "content": "",
            "embeds": [build_abyss_collab_embed(guild, rng)],
            "allowed_mentions": {"parse": []},
        }
        request_json(headers, "POST", f"/channels/{channel['id']}/messages", json_body=payload)
        print("[+] ElysiaAI abyss collaboration posted.")


def channel_type(channel: dict[str, Any]) -> int:
    try:
        return int(channel.get("type", -1))
    except (TypeError, ValueError):
        return -1


def find_channel_by_name(
    channels: list[dict[str, Any]],
    name: str,
    expected_type: int,
) -> dict[str, Any] | None:
    return next(
        (
            channel
            for channel in channels
            if channel.get("name") == name and channel_type(channel) == expected_type
        ),
        None,
    )


def rename_guild_for_abyss_protocol(
    headers: dict[str, str],
    guild: dict[str, Any],
    guild_id: str,
    apply: bool,
) -> None:
    current_name = str(guild.get("name") or "")
    if current_name == ABYSS_PROTOCOL_SERVER_NAME:
        print(f"[*] Server name already set to {ABYSS_PROTOCOL_SERVER_NAME}.")
        return

    if dry_run_or_apply(
        apply,
        f"Rename server from {current_name!r} to {ABYSS_PROTOCOL_SERVER_NAME!r}",
    ):
        request_json(
            headers,
            "PATCH",
            f"/guilds/{guild_id}",
            json_body={"name": ABYSS_PROTOCOL_SERVER_NAME},
        )
        print("[+] Server name updated.")


def ensure_abyss_protocol_category(
    headers: dict[str, str],
    guild_id: str,
    channels: list[dict[str, Any]],
    apply: bool,
) -> dict[str, Any] | None:
    category = find_channel_by_name(channels, ABYSS_PROTOCOL_CATEGORY_NAME, 4)
    if category:
        print(f"[*] Category {ABYSS_PROTOCOL_CATEGORY_NAME} already exists ({category.get('id')}).")
        return category

    if dry_run_or_apply(apply, f"Create category {ABYSS_PROTOCOL_CATEGORY_NAME}"):
        return request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/channels",
            json_body={"name": ABYSS_PROTOCOL_CATEGORY_NAME, "type": 4},
        )
    return None


def ensure_abyss_protocol_channel(
    headers: dict[str, str],
    guild_id: str,
    channels: list[dict[str, Any]],
    category: dict[str, Any] | None,
    name: str,
    topic: str,
    apply: bool,
) -> dict[str, Any] | None:
    existing = find_channel_by_name(channels, name, 0)
    parent_id = category.get("id") if category else None
    payload: dict[str, Any] = {"topic": topic}
    if parent_id:
        payload["parent_id"] = parent_id

    if existing:
        description = f"Update #{name} topic"
        if parent_id:
            description += f" and place it under {ABYSS_PROTOCOL_CATEGORY_NAME}"
        if dry_run_or_apply(apply, description):
            request_json(
                headers,
                "PATCH",
                f"/channels/{existing['id']}",
                json_body=payload,
            )
        return existing

    create_payload: dict[str, Any] = {"name": name, "type": 0, "topic": topic}
    if parent_id:
        create_payload["parent_id"] = parent_id

    description = f"Create text channel #{name}"
    if parent_id:
        description += f" under {ABYSS_PROTOCOL_CATEGORY_NAME}"
    if dry_run_or_apply(apply, description):
        return request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/channels",
            json_body=create_payload,
        )
    return None


def ensure_abyss_protocol_role(
    headers: dict[str, str],
    guild_id: str,
    roles: list[dict[str, Any]],
    apply: bool,
) -> dict[str, Any] | None:
    role = next((item for item in roles if item.get("name") == ABYSS_PROTOCOL_ROLE_NAME), None)
    if role:
        if role.get("managed"):
            raise SystemExit(
                f"[!] Existing @{ABYSS_PROTOCOL_ROLE_NAME} is managed by an integration; refusing to modify it."
            )
        if permission_value(role) != 0:
            raise SystemExit(
                f"[!] Existing @{ABYSS_PROTOCOL_ROLE_NAME} has permissions. Refusing to assign a non-cosmetic role."
            )
        print(f"[*] Role @{ABYSS_PROTOCOL_ROLE_NAME} already exists ({role.get('id')}).")
        return role

    if dry_run_or_apply(apply, f"Create cosmetic role @{ABYSS_PROTOCOL_ROLE_NAME} with no permissions"):
        return request_json(
            headers,
            "POST",
            f"/guilds/{guild_id}/roles",
            json_body={
                "name": ABYSS_PROTOCOL_ROLE_NAME,
                "permissions": "0",
                "color": 0x06B6D4,
                "hoist": False,
                "mentionable": False,
            },
        )
    return None


def build_abyss_overdrive_embed(guild: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    protocol_id = hashlib.sha256(
        f"abyss-protocol-999:{guild.get('id')}:{dt.datetime.now(dt.timezone.utc):%Y%m%d}".encode(
            "utf-8"
        )
    ).hexdigest()[:12].upper()
    phases = rng.sample(
        [
            "ABYSS_COMMAND",
            "SIGNAL_RELAY",
            "MEMORY_ARCHIVE",
            "NOIR_TERMINAL",
            "ELYSIA_CORE",
            "LV999_VISUAL",
        ],
        4,
    )
    channel_lines = "\n".join(f"`#{name}`" for name, _topic in ABYSS_PROTOCOL_CHANNELS)

    return {
        "title": f"{ABYSS_PROTOCOL_SERVER_NAME} // Overdrive Online",
        "description": (
            "```ansi\n"
            "\u001b[2;36m> boot abyss_protocol_999 --visual-overdrive\u001b[0m\n"
            "\u001b[2;35m> theme: deep-cyan / noir / ceremonial\u001b[0m\n"
            "\u001b[2;32m> integrity: preserved\u001b[0m\n"
            "\u001b[2;33m> permissions: cosmetic only\u001b[0m\n"
            "```\n"
            "深淵の名を掲げつつ、守るべきものは静かに守る。"
        ),
        "color": 0x06B6D4,
        "fields": [
            {
                "name": "Server",
                "value": f"`{guild.get('id')}`\n`{ABYSS_PROTOCOL_SERVER_NAME}`",
                "inline": True,
            },
            {
                "name": "Protocol ID",
                "value": f"`{protocol_id}`",
                "inline": True,
            },
            {
                "name": "Channels",
                "value": channel_lines,
                "inline": False,
            },
            {
                "name": "Active Phases",
                "value": "\n".join(f"`{phase}`" for phase in phases),
                "inline": False,
            },
            {
                "name": "Safety Lock",
                "value": "No deletes. No bans. No permission escalation. Dedicated channels only.",
                "inline": False,
            },
        ],
        "footer": {"text": "Abyss Protocol 999 executed by Elysia Funhouse"},
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def post_abyss_protocol_launch(
    headers: dict[str, str],
    guild: dict[str, Any],
    channel: dict[str, Any] | None,
    rng: random.Random,
    apply: bool,
) -> None:
    target = f"#{channel.get('name')}" if channel else f"#{ABYSS_PROTOCOL_CHANNELS[0][0]}"
    if dry_run_or_apply(apply, f"Post Abyss Protocol 999 launch embed to {target}"):
        if not channel:
            print("[!] No launch channel was available after setup.")
            return
        payload = {
            "content": "",
            "embeds": [build_abyss_overdrive_embed(guild, rng)],
            "allowed_mentions": {"parse": []},
        }
        request_json(headers, "POST", f"/channels/{channel['id']}/messages", json_body=payload)
        print("[+] Abyss Protocol 999 launch embed posted.")


def run_abyss_overdrive_operation(
    headers: dict[str, str],
    guild: dict[str, Any],
    guild_id: str,
    user_id: str,
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
    rng: random.Random,
    apply: bool,
) -> None:
    rename_guild_for_abyss_protocol(headers, guild, guild_id, apply)
    category = ensure_abyss_protocol_category(headers, guild_id, channels, apply)

    launch_channel: dict[str, Any] | None = None
    for name, topic in ABYSS_PROTOCOL_CHANNELS:
        channel = ensure_abyss_protocol_channel(
            headers,
            guild_id,
            channels,
            category,
            name,
            topic,
            apply,
        )
        if name == ABYSS_PROTOCOL_CHANNELS[0][0]:
            launch_channel = channel

    role = ensure_abyss_protocol_role(headers, guild_id, roles, apply)
    if role and dry_run_or_apply(apply, f"Assign @{ABYSS_PROTOCOL_ROLE_NAME} to user {user_id}"):
        request_json(headers, "PUT", f"/guilds/{guild_id}/members/{user_id}/roles/{role['id']}")
        print("[+] Abyss Protocol cosmetic role assigned.")

    post_abyss_protocol_launch(headers, guild, launch_channel, rng, apply)


def main() -> int:
    args = parse_args()
    token = get_bot_token()
    headers = {
        "Authorization": f"Bot {token}",
        "User-Agent": "ElysiaAI-Funhouse (safe guild tooling)",
    }

    me = request_json(headers, "GET", "/users/@me")
    guild = request_json(headers, "GET", f"/guilds/{args.guild_id}?with_counts=true")
    roles = request_json(headers, "GET", f"/guilds/{args.guild_id}/roles")
    channels = request_json(headers, "GET", f"/guilds/{args.guild_id}/channels")
    target_member = request_json(headers, "GET", f"/guilds/{args.guild_id}/members/{args.admin_user_id}")
    bot_member = request_json(headers, "GET", f"/guilds/{args.guild_id}/members/{me['id']}")

    target_is_admin, target_admin_sources = admin_status(guild, target_member, roles, args.admin_user_id)
    bot_permissions = merged_permissions(bot_member, roles, str(args.guild_id))
    rng = stable_rng(str(args.guild_id), args.seed)

    print(f"[*] Bot: {me.get('username')} ({me.get('id')})")
    print_summary(guild, target_member, target_is_admin, target_admin_sources, bot_permissions, channels, roles)
    ensure_authorized(target_is_admin)

    if args.action in {"inspect", "plan"}:
        print("")
        print("Available safe actions:")
        print("  post-pulse   -> post one generated embed to a chosen text channel")
        print("  make-lab     -> create/update #elysia-lab")
        print("  crown-admin  -> create a no-permission cosmetic role and assign it to the admin")
        print("  silverwolf   -> create a Silver Wolf Lv.999 cosmetic channel, role, and embed")
        print("  abyss-collab -> create an ElysiaAI abyss collaboration channel, role, and embed")
        print("  abyss-overdrive -> rename/style the server as Abyss Protocol 999 with safe channels")
        print("  all          -> make-lab + crown-admin + post pulse to #elysia-lab")
        print("")
        print("Nothing was changed. Add --apply with an action to execute.")
        return 0

    if args.action == "post-pulse":
        channel = pick_channel(channels, args.channel_id, args.auto_channel)
        post_pulse(headers, guild, channels, roles, channel, rng, args.apply)
    elif args.action == "make-lab":
        if not has_permission(bot_permissions, "manage_channels"):
            raise SystemExit("[!] Bot lacks Manage Channels.")
        ensure_lab_channel(headers, str(args.guild_id), channels, args.apply)
    elif args.action == "crown-admin":
        if not has_permission(bot_permissions, "manage_roles"):
            raise SystemExit("[!] Bot lacks Manage Roles.")
        crown_admin(headers, str(args.guild_id), str(args.admin_user_id), roles, args.apply)
    elif args.action == "silverwolf":
        if not has_permission(bot_permissions, "manage_channels"):
            raise SystemExit("[!] Bot lacks Manage Channels.")
        if not has_permission(bot_permissions, "manage_roles"):
            raise SystemExit("[!] Bot lacks Manage Roles.")
        if not has_permission(bot_permissions, "send_messages"):
            raise SystemExit("[!] Bot lacks Send Messages.")
        if not has_permission(bot_permissions, "embed_links"):
            raise SystemExit("[!] Bot lacks Embed Links.")
        run_silverwolf_operation(
            headers,
            guild,
            str(args.guild_id),
            str(args.admin_user_id),
            channels,
            roles,
            rng,
            args.apply,
        )
    elif args.action == "abyss-collab":
        if not has_permission(bot_permissions, "manage_channels"):
            raise SystemExit("[!] Bot lacks Manage Channels.")
        if not has_permission(bot_permissions, "manage_roles"):
            raise SystemExit("[!] Bot lacks Manage Roles.")
        if not has_permission(bot_permissions, "send_messages"):
            raise SystemExit("[!] Bot lacks Send Messages.")
        if not has_permission(bot_permissions, "embed_links"):
            raise SystemExit("[!] Bot lacks Embed Links.")
        run_abyss_collab_operation(
            headers,
            guild,
            str(args.guild_id),
            str(args.admin_user_id),
            channels,
            roles,
            rng,
            args.apply,
        )
    elif args.action == "abyss-overdrive":
        if str(guild.get("name") or "") != ABYSS_PROTOCOL_SERVER_NAME and not has_permission(
            bot_permissions, "manage_guild"
        ):
            raise SystemExit("[!] Bot lacks Manage Server for the Abyss Protocol rename.")
        if not has_permission(bot_permissions, "manage_channels"):
            raise SystemExit("[!] Bot lacks Manage Channels.")
        if not has_permission(bot_permissions, "manage_roles"):
            raise SystemExit("[!] Bot lacks Manage Roles.")
        if not has_permission(bot_permissions, "send_messages"):
            raise SystemExit("[!] Bot lacks Send Messages.")
        if not has_permission(bot_permissions, "embed_links"):
            raise SystemExit("[!] Bot lacks Embed Links.")
        run_abyss_overdrive_operation(
            headers,
            guild,
            str(args.guild_id),
            str(args.admin_user_id),
            channels,
            roles,
            rng,
            args.apply,
        )
    elif args.action == "all":
        if not has_permission(bot_permissions, "manage_channels"):
            raise SystemExit("[!] Bot lacks Manage Channels.")
        if not has_permission(bot_permissions, "manage_roles"):
            raise SystemExit("[!] Bot lacks Manage Roles.")
        lab = ensure_lab_channel(headers, str(args.guild_id), channels, args.apply)
        if args.apply and lab:
            channels = request_json(headers, "GET", f"/guilds/{args.guild_id}/channels")
        lab = lab or pick_channel(channels, None, True)
        crown_admin(headers, str(args.guild_id), str(args.admin_user_id), roles, args.apply)
        post_pulse(headers, guild, channels, roles, lab, rng, args.apply)

    if not args.apply:
        print("")
        print("Dry-run complete. Re-run with --apply when you want to actually change Discord.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DiscordApiError as exc:
        print(f"[!] Discord API error: {exc}", file=sys.stderr)
        raise SystemExit(1)
