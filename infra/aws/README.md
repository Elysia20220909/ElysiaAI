# ElysiaAI AWS Assist Layer

ElysiaAI remains local-first.

AWS is used only for:

- encrypted backups
- security logs
- external health checks
- secrets storage
- disaster recovery

AWS must not become the primary runtime for ElysiaAI.

## Principle

The local machines are the ElysiaAI core. Keep inference, personal data,
device decisions, local databases, and private prompts on machines you control.
AWS is an assist layer: backup storage, narrow monitoring, notification, and
recovery support.

## MVP Scope

This directory starts with a small AWS CLI based foundation:

- S3 backup bucket configuration
- least-privilege IAM examples
- PowerShell and POSIX shell backup scripts
- restore helper
- CloudWatch log group and metric filter notes
- AWS CLI setup example

Terraform is intentionally omitted for the first pass. The goal is to keep the
surface area small while the AWS Assist Layer proves useful.

## Recommended S3 Layout

```text
elysiaai-backup-bucket
├─ daily/
│  ├─ configs/
│  ├─ db/
│  ├─ logs/
│  └─ reports/
├─ weekly/
└─ incident/
```

The scripts upload archives to one of these top-level prefixes:

- `daily/`
- `weekly/`
- `incident/`

## Required Guardrails

- Block all public access on the bucket.
- Enable bucket versioning.
- Require server-side encryption with SSE-S3 or SSE-KMS.
- Prefer client-side archive encryption before upload.
- Exclude `.env`, private keys, token files, caches, dependency folders, and
  build output.
- Use an IAM user or role with only the permissions required for backup and
  restore.
- Do not use the AWS root user.
- Do not upload conversation logs, raw prompts, tokens, API keys, or private
  personal data.

## Windows Backup

```powershell
$env:ELYSIAAI_BACKUP_PASSPHRASE = "replace-with-a-long-random-passphrase"

.\infra\aws\scripts\backup-to-s3.ps1 `
  -BucketName "elysiaai-backup" `
  -ProjectRoot "." `
  -Profile "elysiaai" `
  -Prefix "daily"
```

The PowerShell script uses OpenSSL for client-side archive encryption when
`ELYSIAAI_BACKUP_PASSPHRASE` is set. It also requests S3 server-side encryption
on upload.

## macOS/Linux Backup

```bash
export ELYSIAAI_BACKUP_PASSPHRASE="replace-with-a-long-random-passphrase"

BUCKET_NAME="elysiaai-backup" \
PROJECT_ROOT="." \
AWS_PROFILE="elysiaai" \
PREFIX="daily" \
./infra/aws/scripts/backup-to-s3.sh
```

## Restore

```bash
export ELYSIAAI_BACKUP_PASSPHRASE="replace-with-the-original-passphrase"

./infra/aws/scripts/restore-from-s3.sh \
  "s3://elysiaai-backup/daily/elysiaai-backup-2026-05-21_10-00-00.tar.gz.enc" \
  "./restore"
```

Always restore into a fresh directory first. Review restored files before moving
them back into an active ElysiaAI workspace.

## Setup Order

1. Create the S3 bucket.
2. Enable public access block, versioning, and encryption.
3. Apply the lifecycle policy in `s3/lifecycle.json`.
4. Create an IAM identity from `iam/backup-policy.json`.
5. Configure an AWS CLI profile named `elysiaai`.
6. Run a test backup with a non-sensitive test folder.
7. Restore the test backup into a temporary folder and verify contents.
8. Add CloudWatch and Secrets Manager only after backups are reliable.

