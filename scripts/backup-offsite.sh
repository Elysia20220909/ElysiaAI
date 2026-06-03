#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

have() {
  command -v "$1" >/dev/null 2>&1
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf 'warning: %s\n' "$*" >&2
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="${REPO_ROOT:-$(cd -- "$script_dir/.." && pwd)}"
app_name="${APP_NAME:-$(basename "$repo_root" | tr '[:upper:]' '[:lower:]')}"
stamp="${BACKUP_STAMP:-$(date -u +%Y-%m-%dT%H%M%SZ)}"
uploads_dir="${UPLOADS_DIR:-$repo_root/uploads}"
keep_work_dir="${BACKUP_KEEP_WORKDIR:-0}"
work_dir_is_temp=0

if [[ -n "${BACKUP_WORKDIR:-}" ]]; then
  work_dir="$BACKUP_WORKDIR"
else
  temp_parent="${TMPDIR:-/tmp}"
  work_dir="$(mktemp -d "${temp_parent%/}/${app_name}-backup-${stamp}.XXXXXX")"
  work_dir_is_temp=1
fi

backup_dest_dir="${BACKUP_DEST_DIR:-}"
backup_s3_uri="${BACKUP_S3_URI:-}"
require_db="${REQUIRE_DB_BACKUP:-0}"
require_uploads="${REQUIRE_UPLOADS_BACKUP:-0}"
sync_delete="${BACKUP_SYNC_DELETE:-0}"

[[ -n "$backup_dest_dir" || -n "$backup_s3_uri" ]] || die "set BACKUP_DEST_DIR or BACKUP_S3_URI"

cleanup() {
  if [[ "$keep_work_dir" != "1" && "$work_dir_is_temp" == "1" && -n "${work_dir:-}" ]]; then
    rm -rf -- "$work_dir"
  fi
}
trap cleanup EXIT

have git || die "git is required"
if [[ -n "$backup_s3_uri" ]]; then
  have aws || die "aws CLI is required when BACKUP_S3_URI is set"
fi

mkdir -p "$work_dir"
chmod 700 "$work_dir"

if ! git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "$repo_root is not a git repository"
fi

if [[ -n "$(git -C "$repo_root" status --short)" ]]; then
  warn "repository has uncommitted changes; git bundle includes committed refs only"
fi

git_bundle="$work_dir/git-${app_name}-${stamp}.bundle"
db_dump="$work_dir/db-${app_name}-${stamp}.dump"

printf 'creating git bundle: %s\n' "$git_bundle"
git -C "$repo_root" bundle create "$git_bundle" --all

db_created=0
if [[ -n "${DATABASE_URL:-}" ]]; then
  have pg_dump || die "pg_dump is required for DATABASE_URL backups"
  printf 'creating database dump from DATABASE_URL: %s\n' "$db_dump"
  pg_dump -Fc "$DATABASE_URL" >"$db_dump"
  db_created=1
elif [[ -n "${PGDATABASE:-}" && -n "${PGUSER:-}" ]]; then
  have pg_dump || die "pg_dump is required for Postgres backups"
  export PGPASSWORD="${PGPASSWORD:-${PGPASS:-}}"
  pg_args=(-Fc -U "$PGUSER")
  [[ -n "${PGHOST:-}" ]] && pg_args+=(-h "$PGHOST")
  [[ -n "${PGPORT:-}" ]] && pg_args+=(-p "$PGPORT")
  printf 'creating database dump: %s\n' "$db_dump"
  pg_dump "${pg_args[@]}" "$PGDATABASE" >"$db_dump"
  db_created=1
else
  if [[ "$require_db" == "1" ]]; then
    die "set DATABASE_URL, or PGDATABASE and PGUSER, for required database backup"
  fi
  warn "database backup skipped; set DATABASE_URL or PGDATABASE/PGUSER"
fi

s3_args=()
if [[ -n "$backup_s3_uri" ]]; then
  if [[ -n "${AWS_S3_SSE_KMS_KEY_ID:-}" ]]; then
    s3_args+=(--sse aws:kms --sse-kms-key-id "$AWS_S3_SSE_KMS_KEY_ID")
  elif [[ "${BACKUP_S3_SSE:-1}" != "0" ]]; then
    s3_args+=(--sse "${BACKUP_S3_SSE_ALGORITHM:-AES256}")
  fi
fi

copy_file() {
  local source_path="$1"
  local base_name
  base_name="$(basename "$source_path")"

  if [[ -n "$backup_dest_dir" ]]; then
    local dest_run_dir="$backup_dest_dir/$stamp"
    mkdir -p "$dest_run_dir"
    cp -f "$source_path" "$dest_run_dir/$base_name"
    printf 'copied %s to %s\n' "$base_name" "$dest_run_dir"
  fi

  if [[ -n "$backup_s3_uri" ]]; then
    aws s3 cp "$source_path" "${backup_s3_uri%/}/$base_name" "${s3_args[@]}"
  fi
}

copy_file "$git_bundle"
if [[ "$db_created" == "1" ]]; then
  copy_file "$db_dump"
fi

if [[ -d "$uploads_dir" ]]; then
  printf 'copying uploads from %s\n' "$uploads_dir"

  if [[ -n "$backup_dest_dir" ]]; then
    local_uploads_dest="$backup_dest_dir/$stamp/uploads"
    mkdir -p "$local_uploads_dest"
    if have rsync; then
      rsync_args=(-a)
      [[ "$sync_delete" == "1" ]] && rsync_args+=(--delete)
      rsync "${rsync_args[@]}" "$uploads_dir"/ "$local_uploads_dest"/
    else
      [[ "$sync_delete" == "1" ]] && die "rsync is required for BACKUP_SYNC_DELETE=1"
      cp -a "$uploads_dir"/. "$local_uploads_dest"/
    fi
    printf 'copied uploads to %s\n' "$local_uploads_dest"
  fi

  if [[ -n "$backup_s3_uri" ]]; then
    sync_args=()
    [[ "$sync_delete" == "1" ]] && sync_args+=(--delete)
    aws s3 sync "$uploads_dir" "${backup_s3_uri%/}/uploads-${stamp}/" "${sync_args[@]}" "${s3_args[@]}"
  fi
else
  if [[ "$require_uploads" == "1" ]]; then
    die "uploads directory not found: $uploads_dir"
  fi
  warn "uploads backup skipped; directory not found: $uploads_dir"
fi

printf 'backup complete: %s\n' "$stamp"
if [[ "$keep_work_dir" == "1" || "$work_dir_is_temp" != "1" ]]; then
  printf 'local working files remain in %s\n' "$work_dir"
else
  printf 'local working files removed from %s\n' "$work_dir"
fi
