# Discord GINROU Command Center

Discord is the primary command-room surface for GINROU-Lv999 style operational updates.

## Active Mode

- Commit notifications: automatic through Discord webhook.
- Audit posture: every automation should leave a visible log message.
- Work reports: post concise completion notes to the same command-room channel.
- Persona: Silver Wolf Lv.999, administrator tone, short and game-like.

## Safety Rules

- Do not post webhook URLs, bot tokens, API keys, signing material, or session secrets.
- Do not build auth bypass, log deletion, stealth persistence, or hidden access paths.
- Use owner-managed, reversible, logged operations only.
- Destructive actions require explicit confirmation and a recovery path.

## Local Setup

Use `.env` for real values. Do not commit secrets.

```text
DISCORD_WEBHOOK_URL=
DISCORD_COMMIT_NOTIFY_ENABLED=true
DISCORD_COMMIT_NOTIFY_WEBHOOK_URL=
DISCORD_COMMIT_NOTIFY_CHANNEL_ID=
DISCORD_COMMIT_NOTIFY_USERNAME=Silver Wolf | Lv.999
DISCORD_COMMIT_NOTIFY_AVATAR_URL=
DISCORD_BOT_TOKEN=
DISCORD_BOT_STATUS=Coddex
DISCORD_APPLICATION_NAME=Sovereign Sentinel
DISCORD_APPLICATION_ID=1080413446253858827
DISCORD_PUBLIC_KEY=66c13042f14bd63e0828eafb10d2914eed95533198e382418475a479431651ea
DISCORD_RICH_PRESENCE_ENABLED=false
DISCORD_RICH_PRESENCE_STATE=Playing Solo
DISCORD_RICH_PRESENCE_DETAILS=Competitive
DISCORD_RICH_PRESENCE_LARGE_IMAGE_TEXT=Numbani
DISCORD_RICH_PRESENCE_SMALL_IMAGE_TEXT=Rogue - Level 100
DISCORD_RICH_PRESENCE_PARTY_SIZE=1
DISCORD_RICH_PRESENCE_PARTY_MAX=5
DISCORD_RICH_PRESENCE_JOIN_SECRET=
```

The post-commit hook sends both Slack and Discord notifications when configured. Discord uses `DISCORD_COMMIT_NOTIFY_WEBHOOK_URL` first, then falls back to `DISCORD_BOT_TOKEN` plus `DISCORD_COMMIT_NOTIFY_CHANNEL_ID`.

`Sovereign Sentinel` is the Discord application identity for slash commands and
Interactions. Its application ID and public key may be documented, but the bot
token must stay only in local `.env` or secret storage.

## Minimal Bot Client

`scripts/discord/sovereign_sentinel_client.py` is the smallest safe client for
Sovereign Sentinel's message replies and bot presence:

```powershell
python scripts/discord/sovereign_sentinel_client.py
```

It reads `DISCORD_BOT_TOKEN` and `DISCORD_BOT_STATUS` from local `.env`. Enable
the Message Content Intent in the Discord Developer Portal if `hello` and `おもち`
messages do not trigger replies.

For the `bot_omoti.py` compatibility entrypoint:

```powershell
python3 bot_omoti.py
```

### Keep Bot Running

Use the local supervisor when you want the bot to restart after crashes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/discord/run_bot_omoti_forever.ps1
```

Install a current-user Windows Task Scheduler entry so it starts at logon:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/discord/install_bot_omoti_task.ps1
Start-ScheduledTask -TaskName "ElysiaAI Discord Bot Omoti"
```

Stop and remove the scheduled task:

```powershell
Stop-ScheduledTask -TaskName "ElysiaAI Discord Bot Omoti"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/discord/install_bot_omoti_task.ps1 -Uninstall
```

The supervisor writes runtime logs under `logs/discord-bot/`, which is ignored by
Git. It refuses to start without `.env` and `DISCORD_BOT_TOKEN`, so leaked tokens
are not silently reused.

## Rich Presence

Use Rich Presence for the desktop app's public status card, not for bot command
handling. The C `DiscordRichPresence` sample maps to these concepts:

| Field | ElysiaAI setting | Notes |
| --- | --- | --- |
| `state` | `DISCORD_RICH_PRESENCE_STATE` | Secondary public status text. |
| `details` | `DISCORD_RICH_PRESENCE_DETAILS` | Main public activity text. |
| `startTimestamp` | runtime value | Prefer the current session start time. |
| `endTimestamp` | runtime value | Omit unless showing a countdown. |
| `largeImageText` | `DISCORD_RICH_PRESENCE_LARGE_IMAGE_TEXT` | Hover text for a configured Discord asset. |
| `smallImageText` | `DISCORD_RICH_PRESENCE_SMALL_IMAGE_TEXT` | Hover text for a configured Discord asset. |
| `partySize` / `partyMax` | `DISCORD_RICH_PRESENCE_PARTY_SIZE` / `DISCORD_RICH_PRESENCE_PARTY_MAX` | Public party count. |
| `joinSecret` | `DISCORD_RICH_PRESENCE_JOIN_SECRET` | Generate per session; do not hard-code or commit. |

For a Discord bot status, use the bot gateway/client presence API instead of
Rich Presence. For a desktop-native app, prefer Discord's current Social SDK
Rich Presence flow; for an in-Discord Activity, use the Embedded App SDK.

```powershell
bun scripts/discord-commit-notify.ts --dry-run
bun scripts/slack-commit-notify.ts --dry-run
```

## Message Shape

```text
銀狼Lv999 // TRACE CAPTURED
Commit signal intercepted.

管理人権限、確認。
Discord司令室へ同期。
ログは残す。秘密は出さない。正規ルートだけ通す。
```
