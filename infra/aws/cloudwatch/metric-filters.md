# CloudWatch Metric Filters

Metric filters should detect important operational signals without ingesting
private local data.

## Suggested Metrics

| Log group | Filter pattern | Metric namespace | Metric name |
| --- | --- | --- | --- |
| `/elysiaai/backup` | `{ $.event = "BACKUP_FAILED" }` | `ElysiaAI` | `BackupFailed` |
| `/elysiaai/backup` | `{ $.event = "BACKUP_SUCCEEDED" }` | `ElysiaAI` | `BackupSucceeded` |
| `/elysiaai/security` | `{ $.severity = "CRITICAL" }` | `ElysiaAI` | `CriticalSecurityEvent` |
| `/elysiaai/health` | `{ $.event = "HEALTH_CHECK_FAILED" }` | `ElysiaAI` | `HealthCheckFailed` |
| `/elysiaai/device-monitor` | `{ $.event = "DEVICE_OFFLINE" }` | `ElysiaAI` | `DeviceOffline` |

## Example AWS CLI Command

```bash
aws logs put-metric-filter \
  --log-group-name "/elysiaai/backup" \
  --filter-name "BackupFailed" \
  --filter-pattern '{ $.event = "BACKUP_FAILED" }' \
  --metric-transformations \
    metricName=BackupFailed,metricNamespace=ElysiaAI,metricValue=1 \
  --profile elysiaai
```

## Alarm Guidance

Start with simple alarms:

- `BackupFailed >= 1` over 1 evaluation period
- `CriticalSecurityEvent >= 1` over 1 evaluation period
- `HealthCheckFailed >= 3` over 15 minutes

Notify through SNS, Discord, Slack, or another channel that does not expose
secret values in the message body.
