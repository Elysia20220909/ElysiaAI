#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 s3://bucket/prefix/archive.{zip,tar.gz}[.enc] destination_dir [aws_profile]" >&2
  exit 1
fi

s3_uri="$1"
destination_dir="$2"
aws_profile="${3:-${AWS_PROFILE:-elysiaai}}"
passphrase_env_var="${PASSPHRASE_ENV_VAR:-ELYSIAAI_BACKUP_PASSPHRASE}"

command -v aws >/dev/null 2>&1 || {
  echo "Required command not found: aws" >&2
  exit 1
}

backup_name="$(basename "$s3_uri")"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/elysiaai-restore.XXXXXX")"
download_path="${temp_dir}/${backup_name}"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$destination_dir"

echo "Downloading ${s3_uri}"
aws s3 cp "$s3_uri" "$download_path" --profile "$aws_profile"

archive_path="$download_path"

if [[ "$download_path" == *.enc ]]; then
  command -v openssl >/dev/null 2>&1 || {
    echo "Required command not found: openssl" >&2
    exit 1
  }

  if [[ -z "${!passphrase_env_var:-}" ]]; then
    echo "Set ${passphrase_env_var} to decrypt this archive." >&2
    exit 1
  fi

  archive_path="${download_path%.enc}"
  echo "Decrypting archive"
  openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$download_path" \
    -out "$archive_path" \
    -pass "env:${passphrase_env_var}"
fi

case "$archive_path" in
  *.tar.gz|*.tgz)
    tar -xzf "$archive_path" -C "$destination_dir"
    ;;
  *.zip)
    command -v unzip >/dev/null 2>&1 || {
      echo "Required command not found: unzip" >&2
      exit 1
    }
    unzip -q "$archive_path" -d "$destination_dir"
    ;;
  *)
    echo "Unsupported archive type: ${archive_path}" >&2
    exit 1
    ;;
esac

echo "Restore complete: ${destination_dir}"

