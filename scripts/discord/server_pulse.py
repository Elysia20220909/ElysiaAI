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
from dataclasses import dataclass
from pathlib import Path
from typing import Any

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


API_BASE = "https://discord.com/api/v10"
DEFAULT_GUILD_ID = "1300413159919583234"

CHANNEL_TYPE_NAMES = {
    0: "text",
    2: "voice",
    4: "category",
    5: "announcement",
    13: "stage",
    15: "forum",
    16: "media",
}

VIBE_CODES = [
    "Meteor Garden",
    "Neon Shrine",
    "Midnight Lobby",
    "Rainproof HQ",
    "Overclocked Tea Room",
    "Soft Launch Orbit",
    "Afterimage Arcade",
    "Lantern Protocol",
]

QUESTS = [
    "Drop one screenshot, one track, or one tiny win from today.",
    "Ask a question that can be answered in under 30 seconds.",
    "Revive one quiet channel with a low-stakes prompt.",
    "Invite someone to a 10-minute voice check-in, then leave before it becomes a meeting.",
    "Pin one useful thing, remove one stale thing, and call it maintenance magic.",
    "Post a build, loadout, clip, or idea with exactly one sentence of context.",
]

WEATHER = [
    "clear comms",
    "light chaos",
    "high-energy static",
    "cozy lurk weather",
    "patch-note pressure",
    "voice-channel gravity",
]


class DiscordApiError(RuntimeError):
    pass


@dataclass
class Pulse:
    guild_id: str
    guild_name: str
    member_count: int | None
    presence_count: int | None
    channel_total: int
    text_channels: list[dict[str, Any]]
    voice_channels: list[dict[str, Any]]
    roles: list[dict[str, Any]]
    seed: int
    vibe_code: str
    weather: str
    chaos_score: int
    lucky_channel: dict[str, Any] | None
    featured_role: dict[str, Any] | None
    quest: str
    created_at: dt.datetime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a fun Discord server pulse report. Posting is opt-in."
    )
    parser.add_argument(
        "--guild-id",
        default=os.getenv("DISCORD_GUILD_ID", DEFAULT_GUILD_ID),
        help=f"Discord guild/server ID. Default: {DEFAULT_GUILD_ID}",
    )
    parser.add_argument(
        "--post-channel-id",
        help="Optional channel ID to post the pulse embed. Without this, the script only prints a preview.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print compact JSON instead of the readable preview.",
    )
    parser.add_argument(
        "--seed",
        help="Optional custom seed. Default is guild ID + current UTC date.",
    )
    return parser.parse_args()


def get_bot_token() -> str:
    load_local_env()
    token = os.getenv("DISCORD_BOT_TOKEN", "").strip().strip('"').strip("'")
    if not token:
        raise SystemExit("[!] DISCORD_BOT_TOKEN is missing in .env")
    return token


def load_local_env() -> None:
    env_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]
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

        request = urllib.request.Request(
            url,
            data=data,
            headers=request_headers,
            method=method,
        )

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

    raise DiscordApiError(f"{method} {path} failed after rate-limit retries")


def snowflake_created_at(snowflake_id: str) -> dt.datetime:
    discord_epoch_ms = 1420070400000
    created_ms = (int(snowflake_id) >> 22) + discord_epoch_ms
    return dt.datetime.fromtimestamp(created_ms / 1000, tz=dt.timezone.utc)


def stable_seed(guild_id: str, custom_seed: str | None) -> int:
    seed_text = custom_seed or f"{guild_id}:{dt.datetime.now(dt.timezone.utc):%Y-%m-%d}"
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def safe_name(item: dict[str, Any] | None, fallback: str = "none") -> str:
    if not item:
        return fallback
    return str(item.get("name") or fallback)


def build_pulse(
    guild: dict[str, Any],
    channels: list[dict[str, Any]],
    roles: list[dict[str, Any]],
    seed: int,
) -> Pulse:
    rng = random.Random(seed)
    guild_id = str(guild["id"])
    guild_name = str(guild.get("name") or guild_id)
    text_channels = [
        channel
        for channel in channels
        if int(channel.get("type", -1)) in {0, 5, 15, 16}
    ]
    voice_channels = [
        channel
        for channel in channels
        if int(channel.get("type", -1)) in {2, 13}
    ]
    named_roles = [
        role
        for role in roles
        if role.get("name") != "@everyone" and not role.get("managed", False)
    ]

    member_count = guild.get("approximate_member_count")
    presence_count = guild.get("approximate_presence_count")
    online_ratio = 0
    if member_count:
        online_ratio = int((int(presence_count or 0) / int(member_count)) * 100)

    chaos_score = min(
        99,
        max(
            1,
            12
            + len(text_channels) * 3
            + len(voice_channels) * 5
            + len(named_roles) * 2
            + online_ratio,
        ),
    )

    return Pulse(
        guild_id=guild_id,
        guild_name=guild_name,
        member_count=int(member_count) if member_count is not None else None,
        presence_count=int(presence_count) if presence_count is not None else None,
        channel_total=len(channels),
        text_channels=text_channels,
        voice_channels=voice_channels,
        roles=named_roles,
        seed=seed,
        vibe_code=rng.choice(VIBE_CODES),
        weather=rng.choice(WEATHER),
        chaos_score=chaos_score,
        lucky_channel=rng.choice(text_channels) if text_channels else None,
        featured_role=rng.choice(named_roles) if named_roles else None,
        quest=rng.choice(QUESTS),
        created_at=snowflake_created_at(guild_id),
    )


def pulse_to_dict(pulse: Pulse) -> dict[str, Any]:
    return {
        "guild_id": pulse.guild_id,
        "guild_name": pulse.guild_name,
        "members": pulse.member_count,
        "online": pulse.presence_count,
        "channels": pulse.channel_total,
        "text_channels": len(pulse.text_channels),
        "voice_channels": len(pulse.voice_channels),
        "roles": len(pulse.roles),
        "vibe_code": pulse.vibe_code,
        "weather": pulse.weather,
        "chaos_score": pulse.chaos_score,
        "lucky_channel": safe_name(pulse.lucky_channel),
        "featured_role": safe_name(pulse.featured_role),
        "quest": pulse.quest,
        "created_at_utc": pulse.created_at.isoformat(),
    }


def render_preview(pulse: Pulse) -> str:
    member_line = "unknown"
    if pulse.member_count is not None:
        member_line = str(pulse.member_count)
        if pulse.presence_count is not None:
            member_line += f" members / {pulse.presence_count} online-ish"

    lines = [
        "=====================================================",
        "   ELYSIA DISCORD SERVER PULSE",
        "=====================================================",
        f"Server: {pulse.guild_name} ({pulse.guild_id})",
        f"Created: {pulse.created_at:%Y-%m-%d %H:%M:%S} UTC",
        f"Population: {member_line}",
        f"Structure: {pulse.channel_total} channels / {len(pulse.roles)} visible roles",
        "",
        f"Vibe code: {pulse.vibe_code}",
        f"Weather: {pulse.weather}",
        f"Chaos score: {pulse.chaos_score}/99",
        f"Lucky channel: #{safe_name(pulse.lucky_channel)}",
        f"Featured role: @{safe_name(pulse.featured_role)}",
        "",
        f"Today's micro-quest: {pulse.quest}",
        "",
        "Post mode is opt-in: add --post-channel-id CHANNEL_ID to send one embed.",
    ]
    return "\n".join(lines)


def build_embed(pulse: Pulse) -> dict[str, Any]:
    members = "unknown"
    if pulse.member_count is not None:
        members = str(pulse.member_count)
        if pulse.presence_count is not None:
            members = f"{pulse.member_count} / {pulse.presence_count} online-ish"

    return {
        "title": f"Server Pulse // {pulse.guild_name}",
        "description": (
            f"**{pulse.vibe_code}**\n"
            f"Weather: `{pulse.weather}`\n"
            f"Chaos score: `{pulse.chaos_score}/99`"
        ),
        "color": 0x8B5CF6,
        "fields": [
            {
                "name": "Snapshot",
                "value": (
                    f"Members: `{members}`\n"
                    f"Channels: `{pulse.channel_total}`\n"
                    f"Roles: `{len(pulse.roles)}`"
                ),
                "inline": True,
            },
            {
                "name": "Lucky Signal",
                "value": (
                    f"Channel: `#{safe_name(pulse.lucky_channel)}`\n"
                    f"Role: `@{safe_name(pulse.featured_role)}`"
                ),
                "inline": True,
            },
            {
                "name": "Today's Micro-Quest",
                "value": pulse.quest,
                "inline": False,
            },
        ],
        "footer": {
            "text": f"Guild ID {pulse.guild_id} | generated safely, no permission changes",
        },
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def main() -> int:
    args = parse_args()
    token = get_bot_token()
    headers = {
        "Authorization": f"Bot {token}",
        "User-Agent": "ElysiaAI-ServerPulse (safe guild report)",
    }

    me = request_json(headers, "GET", "/users/@me")
    guild = request_json(headers, "GET", f"/guilds/{args.guild_id}?with_counts=true")
    channels = request_json(headers, "GET", f"/guilds/{args.guild_id}/channels")
    roles = request_json(headers, "GET", f"/guilds/{args.guild_id}/roles")

    seed = stable_seed(str(args.guild_id), args.seed)
    pulse = build_pulse(guild, channels, roles, seed)

    if args.json:
        print(json.dumps(pulse_to_dict(pulse), ensure_ascii=False, separators=(",", ":")))
    else:
        print(f"[*] Bot: {me.get('username')} ({me.get('id')})")
        print(render_preview(pulse))

    if args.post_channel_id:
        payload = {
            "content": "",
            "embeds": [build_embed(pulse)],
            "allowed_mentions": {"parse": []},
        }
        request_json(
            headers,
            "POST",
            f"/channels/{args.post_channel_id}/messages",
            json_body=payload,
        )
        print(f"[+] Posted one Server Pulse embed to channel {args.post_channel_id}.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DiscordApiError as exc:
        print(f"[!] Discord API error: {exc}", file=sys.stderr)
        raise SystemExit(1)
