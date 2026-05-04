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
DISCORD_COMMIT_NOTIFY_USERNAME=Silver Wolf | Lv.999
DISCORD_COMMIT_NOTIFY_AVATAR_URL=
```

The post-commit hook sends both Slack and Discord notifications when configured.

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
