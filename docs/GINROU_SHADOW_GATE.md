# GINROU-Lv999 Shadow Gate

This is the safe owner-only Slack and GitHub bridge for a self-hosted ElysiaAI node.
It is styled like a shadow admin gate, but it is not a backdoor.

The concept is:

```text
裏口っぽい正門
```

The entrance looks like a Shadow Gate, but the real implementation is owner authentication, Slack's official tokens, audit logging, backups, and rollback.

## Security Line

Allowed:

- Owner-only Slack command console
- Socket Mode so the self-host does not need a public HTTP endpoint
- GitHub read-only repository status
- Official GitHub Slack app subscribe command generation
- Audit logging through Slack Bot API

Not allowed:

- Auth bypass
- Hidden persistence
- Log deletion
- Credential theft
- Unauthorized access
- Evasion or stealth behavior

## Shadow Gate Quote

```text
Shadow Gate、起動。
管理人エリシアを確認。
これは侵入口じゃない。
この鯖の主だけが開けられる、月下の管理扉。
```

## Slack App

Use one Slack app:

```text
App name: GINROU-Lv999
Slash command: /ginrou
Socket Mode: enabled
Bot scopes: commands, chat:write, app_mentions:read
App-level token scope: connections:write
```

If you use public HTTP mode instead of Socket Mode, point the Slash Command Request URL at:

```text
https://<your-host>/api/slack/commands
```

Socket Mode is preferred for a self-host because the server opens the WebSocket connection to Slack.

A starter Slack App Manifest is available at:

```text
config/slack/ginrou-lv999-shadow-gate-manifest.json
```

## Bootstrap

After the app is installed, type this once in Slack:

```text
/ginrou setup
```

When `GINROU_OWNER_USER_ID` is not configured, only `setup` is allowed. It returns a local env template using the calling Slack user ID and channel ID. Do not paste real tokens into Slack.

## Required Env

```bash
SLACK_COMMAND_NAME=/ginrou
SLACK_SOCKET_MODE_ENABLED=true
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...

GINROU_OWNER_USER_ID=U...
GINROU_AUDIT_CHANNEL_ID=C...
GINROU_ALLOWED_CHANNEL_IDS=C...
GINROU_GATE_DEFAULT_LOCKED=false

GINROU_DEFAULT_REPO=Elysia20220909/ElysiaAI
GITHUB_TOKEN=<github-token>

GINROU_COMMIT_NOTIFY_ENABLED=true
GINROU_COMMIT_NOTIFY_CHANNEL_ID=C...
GINROU_COMMIT_NOTIFY_USERNAME=銀狼Lv999
GINROU_COMMIT_NOTIFY_ICON_EMOJI=:video_game:
```

For HTTP Request URL mode, also set:

```bash
SLACK_SIGNING_SECRET=...
```

## Commands

```text
/ginrou setup
/ginrou open
/ginrou persona
/ginrou status
/ginrou deploy check
/ginrou logs
/ginrou repo status
/ginrou repo connect
/ginrou repo slack
/ginrou slack style silverwolf
/ginrou style backdoor
/ginrou lock
/ginrou unlock
/ginrou audit
/ginrou notify test
```

## GitHub Slack Feed

For the official Slack GitHub app feed, run this in the target channel:

```text
/github subscribe Elysia20220909/ElysiaAI commits pulls issues workflows
```

The GINROU bridge stays read-only for GitHub. Write actions should be added only as separate owner-confirmed commands.

## Local Commit Notifications

Local commit notifications use the tracked `.githooks/post-commit` hook and the `scripts/slack-commit-notify.ts` sender. Install the hook path once:

```bash
bun run hooks:install
```

Then set one of these notification transports in `.env`:

```bash
# Preferred for the GINROU Slack App
SLACK_BOT_TOKEN=xoxb-...
GINROU_COMMIT_NOTIFY_CHANNEL_ID=C...

# Or use Incoming Webhook
GINROU_COMMIT_NOTIFY_WEBHOOK_URL=<slack-webhook-url>
```

If `GINROU_COMMIT_NOTIFY_CHANNEL_ID` is not set, the sender falls back to `GINROU_AUDIT_CHANNEL_ID`. The hook sends the repo, branch, author, commit link, and subject to Slack after `git commit`. If no Slack transport is configured, it skips without blocking the commit.

Preview the payload without sending:

```bash
bun run notify:commit
```
