# ElysiaAI AWS Assist Layer Architecture

## Positioning

ElysiaAI Local Core is the primary system. AWS is a narrow assist layer.

```text
Local Machines
├─ MacStudio
├─ MacMini
├─ Windows Gaming PC
├─ Home Server
├─ Raspberry Pi Nodes
├─ Local LLM
├─ Local DB
└─ Device Monitor

AWS Assist Layer
├─ S3 Backup
├─ IAM Least Privilege
├─ Secrets Manager
├─ CloudWatch Logs
├─ EventBridge Schedule
├─ Lambda Health Check
└─ SNS or Discord Notification
```

## What Stays Local

- AI inference
- personal data
- local databases
- OS-level decisions
- device monitoring state
- Tauri UI runtime
- local LLM prompts and completions
- home network APIs

## What AWS May Handle

- encrypted backup archives
- minimal operational logs
- external health checks through a private tunnel or VPN
- notification fan-out
- selected external service secrets
- disaster recovery documentation

## Data Classification

| Class | Examples | AWS Handling |
| --- | --- | --- |
| Public | docs, examples, architecture notes | Allowed |
| Operational | health status, backup success or failure, component uptime | Allowed after redaction |
| Sensitive | `.env.example`, sanitized configs, audit summaries | Allowed in encrypted backups |
| Secret | `.env`, API keys, SSH private keys, tokens | Do not back up as files |
| Private personal data | conversations, raw prompts, local files, identity data | Keep local by default |

## Phase 1: S3 Backup

The first AWS capability is encrypted backup to S3.

```text
Local ElysiaAI workspace
  -> backup script
  -> encrypted archive
  -> S3 bucket with versioning and encryption
  -> lifecycle cleanup
```

Minimum controls:

- client-side encryption before upload
- S3 server-side encryption
- versioning
- lifecycle expiry
- public access block
- least-privilege IAM
- no raw secret files

## Phase 2: CloudWatch Logs

Send only small, redacted operational events.

Recommended log groups:

- `/elysiaai/system`
- `/elysiaai/security`
- `/elysiaai/device-monitor`
- `/elysiaai/backup`
- `/elysiaai/health`

Do not send:

- conversation logs
- raw prompts
- API keys
- auth tokens
- private personal data
- complete local LLM traces

## Phase 3: Secrets Manager

Secrets Manager can store selected external integration secrets:

- `/elysiaai/prod/discord/webhook`
- `/elysiaai/prod/github/token`
- `/elysiaai/prod/openai/api_key`
- `/elysiaai/prod/slack/webhook`

Start with the smallest useful set. Avoid moving every local secret to AWS on
day one.

## Phase 4: Health Checks

A remote health check requires a secure path into the local environment.

```text
EventBridge
  -> Lambda
  -> private tunnel or VPN
  -> ElysiaAI health endpoint
  -> SNS or Discord notification
```

Acceptable access patterns:

- Tailscale
- WireGuard
- Cloudflare Tunnel
- VPN
- fixed IP allowlist plus strong authentication

Avoid exposing a local API directly to the public internet.

## Recovery Model

1. Provision a clean machine.
2. Install AWS CLI and OpenSSL.
3. Configure the limited restore profile.
4. Download the selected backup archive.
5. Decrypt locally.
6. Restore into a temporary directory.
7. Review restored files.
8. Move approved files back into the active ElysiaAI workspace.
