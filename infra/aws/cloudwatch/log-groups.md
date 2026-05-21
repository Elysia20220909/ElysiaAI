# CloudWatch Log Groups

CloudWatch should receive only redacted operational events. It is not a full
copy of local ElysiaAI logs.

## Recommended Groups

| Log group | Purpose | Retention |
| --- | --- | --- |
| `/elysiaai/system` | startup, shutdown, version, service status | 30 days |
| `/elysiaai/security` | auth failures, policy denials, integrity alerts | 90 days |
| `/elysiaai/device-monitor` | device health summaries, offline events | 30 days |
| `/elysiaai/backup` | backup started, succeeded, failed, restored | 90 days |
| `/elysiaai/health` | periodic health summary events | 30 days |

## Redaction Rules

Do not send:

- raw prompts
- conversation content
- API keys
- auth tokens
- cookie values
- private file contents
- complete local LLM traces
- personal identity data

Send:

- component name
- event type
- severity
- timestamp
- host alias
- sanitized error code
- short redacted message

## Example Event

```json
{
  "timestamp": "2026-05-21T10:00:00Z",
  "component": "backup",
  "severity": "ERROR",
  "event": "BACKUP_FAILED",
  "host": "home-server",
  "message": "S3 upload failed after 3 attempts",
  "error_code": "S3_UPLOAD_FAILED"
}
```

