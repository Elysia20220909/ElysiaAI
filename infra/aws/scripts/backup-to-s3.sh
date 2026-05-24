#!/usr/bin/env bash
set -euo pipefail

bucket_name="${BUCKET_NAME:-elysiaai-backup}"
project_root="${PROJECT_ROOT:-.}"
aws_profile="${AWS_PROFILE:-elysiaai}"
prefix="${PREFIX:-daily}"
kms_key_id="${KMS_KEY_ID:-}"
passphrase_env_var="${PASSPHRASE_ENV_VAR:-ELYSIAAI_BACKUP_PASSPHRASE}"
allow_unencrypted_archive="${ALLOW_UNENCRYPTED_ARCHIVE:-false}"

case "$prefix" in
  daily|weekly|incident) ;;
  *)
    echo "PREFIX must be one of: daily, weekly, incident" >&2
    exit 1
    ;;
esac

command -v aws >/dev/null 2>&1 || {
  echo "Required command not found: aws" >&2
  exit 1
}

root_path="$(cd "$project_root" && pwd)"
backup_base_name="elysiaai-backup-$(date +"%Y-%m-%d_%H-%M-%S")"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/${backup_base_name}.XXXXXX")"
plain_archive="${temp_dir}/${backup_base_name}.tar.gz"
encrypted_archive="${plain_archive}.enc"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

exclude_args=(
  "--exclude=.git"
  "--exclude=.next"
  "--exclude=.turbo"
  "--exclude=.venv"
  "--exclude=__pycache__"
  "--exclude=build"
  "--exclude=coverage"
  "--exclude=dist"
  "--exclude=node_modules"
  "--exclude=target"
  "--exclude=venv"
  "--exclude=.env"
  "--exclude=.env.local"
  "--exclude=.env.development"
  "--exclude=.env.production"
  "--exclude=.env.test"
  "--exclude=.envrc"
  "--exclude=.netrc"
  "--exclude=.npmrc"
  "--exclude=.pypirc"
  "--exclude=id_ed25519"
  "--exclude=id_rsa"
  "--exclude=*.key"
  "--exclude=*.p12"
  "--exclude=*.pem"
  "--exclude=*.pfx"
  "--exclude=*.secret.*"
  "--exclude=secrets.*"
)

echo "Creating ElysiaAI backup from ${root_path}"
tar -czf "$plain_archive" -C "$root_path" "${exclude_args[@]}" .

upload_path="$plain_archive"
upload_name="${backup_base_name}.tar.gz"

if [[ -n "${!passphrase_env_var:-}" ]]; then
  command -v openssl >/dev/null 2>&1 || {
    echo "Required command not found: openssl" >&2
    exit 1
  }

  echo "Encrypting archive with OpenSSL AES-256-CBC and PBKDF2"
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$plain_archive" \
    -out "$encrypted_archive" \
    -pass "env:${passphrase_env_var}"
  rm -f "$plain_archive"
  upload_path="$encrypted_archive"
  upload_name="${backup_base_name}.tar.gz.enc"
elif [[ "$allow_unencrypted_archive" != "true" ]]; then
  echo "Set ${passphrase_env_var} for client-side encryption, or set ALLOW_UNENCRYPTED_ARCHIVE=true." >&2
  exit 1
else
  echo "Warning: uploading an unencrypted local archive. S3 server-side encryption will still be requested." >&2
fi

destination="s3://${bucket_name}/${prefix}/${upload_name}"
aws_args=(s3 cp "$upload_path" "$destination" --profile "$aws_profile")

if [[ -n "$kms_key_id" ]]; then
  aws_args+=(--sse aws:kms --sse-kms-key-id "$kms_key_id")
else
  aws_args+=(--sse AES256)
fi

echo "Uploading backup to ${destination}"
aws "${aws_args[@]}"
echo "Backup uploaded: ${destination}"
