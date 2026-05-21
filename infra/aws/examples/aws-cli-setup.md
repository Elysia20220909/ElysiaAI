# AWS CLI Setup

## 1. Create a Profile

```bash
aws configure --profile elysiaai
```

Use an IAM access key with the policy in `../iam/backup-policy.json`. Do not use
the AWS root user.

## 2. Create the Bucket

For `us-east-1`:

```bash
aws s3api create-bucket \
  --bucket elysiaai-backup \
  --region us-east-1 \
  --profile elysiaai
```

For other regions:

```bash
aws s3api create-bucket \
  --bucket elysiaai-backup \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1 \
  --profile elysiaai
```

## 3. Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket elysiaai-backup \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile elysiaai
```

## 4. Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket elysiaai-backup \
  --versioning-configuration Status=Enabled \
  --profile elysiaai
```

## 5. Enable Default Encryption

SSE-S3:

```bash
aws s3api put-bucket-encryption \
  --bucket elysiaai-backup \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }' \
  --profile elysiaai
```

SSE-KMS:

```bash
aws s3api put-bucket-encryption \
  --bucket elysiaai-backup \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "REPLACE_WITH_KMS_KEY_ARN"
        }
      }
    ]
  }' \
  --profile elysiaai
```

## 6. Apply Bucket Policy

Replace `REPLACE_WITH_BUCKET_NAME` in `../s3/bucket-policy.json`, then run:

```bash
aws s3api put-bucket-policy \
  --bucket elysiaai-backup \
  --policy file://infra/aws/s3/bucket-policy.json \
  --profile elysiaai
```

## 7. Apply Lifecycle Policy

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket elysiaai-backup \
  --lifecycle-configuration file://infra/aws/s3/lifecycle.json \
  --profile elysiaai
```

## 8. Test With Non-Sensitive Data

Create a small temporary folder with fake files first. Run backup and restore
against that folder before backing up a real ElysiaAI workspace.

