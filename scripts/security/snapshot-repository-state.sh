#!/usr/bin/env bash
set -euo pipefail

die() {
  printf 'snapshot error: %s\n' "$*" >&2
  exit 1
}

is_denied_path() {
  case "$1" in
    .env|*/.env)
      return 0
      ;;
    .env.*|*/.env.*)
      [[ "$1" == *.example ]] && return 1
      return 0
      ;;
    *.pem|*.key|*.p12|*.pfx|*id_rsa*|*id_ed25519*)
      return 0
      ;;
  esac
  return 1
}

read_snapshot_paths() {
  if [[ -n "${SNAPSHOT_PATHS_FILE:-}" && -f "${SNAPSHOT_PATHS_FILE:-}" ]]; then
    sed -e 's/[[:space:]]*$//' -e '/^[[:space:]]*#/d' -e '/^[[:space:]]*$/d' "$SNAPSHOT_PATHS_FILE"
    return
  fi

  cat <<'PATHS'
.github/workflows
.github/dependabot.yml
.github/CODEOWNERS
.github/SECURITY.md
.github/PULL_REQUEST_TEMPLATE.md
.github/pull_request_template.md
.github/ISSUE_TEMPLATE
.gitleaks.toml
AGENTS.md
package.json
bun.lock
bun.lockb
prisma/schema.prisma
docs/CI_POLICY.md
docs/SECURITY.md
docs/SECRET_MANAGEMENT.md
docs/THREAT_MODEL.md
docs/security
.env.example
config/.env.example
PATHS
}

out_dir="${1:-${SNAPSHOT_OUT:-}}"
[[ -n "$out_dir" ]] || die "usage: $0 <output-dir>"

repo_root="$(git rev-parse --show-toplevel)"
repo_name="${GITHUB_REPOSITORY:-$(basename "$repo_root")}"
mkdir -p "$out_dir"
out_abs="$(cd "$out_dir" && pwd -P)"
repo_abs="$(cd "$repo_root" && pwd -P)"

[[ "$out_abs" != "/" ]] || die "refusing to write to filesystem root"
[[ "$out_abs" != "$repo_abs" ]] || die "output directory must not be the repository root"

rm -rf "$out_abs/files" "$out_abs/MANIFEST.txt" "$out_abs/MANIFEST.sha256" "$out_abs/SELECTED_PATHS.txt"
mkdir -p "$out_abs/files"

cd "$repo_abs"
read_snapshot_paths > "$out_abs/SELECTED_PATHS.txt"

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  while IFS= read -r -d '' file; do
    if is_denied_path "$file"; then
      printf 'skip denied path: %s\n' "$file" >&2
      continue
    fi
    dest="$out_abs/files/$file"
    mkdir -p "$(dirname "$dest")"
    cp -p "$file" "$dest"
  done < <(git ls-files -z -- "$path")
done < "$out_abs/SELECTED_PATHS.txt"

cat > "$out_abs/MANIFEST.txt" <<EOF_MANIFEST
snapshot_format=repository-state-v1
source_repository=$repo_name
content_root=files
note=Generated from tracked allowlisted files only. Secrets, logs, caches, and local runtime data are intentionally excluded.
EOF_MANIFEST

if find "$out_abs/files" -type f -print -quit | grep -q .; then
  (
    cd "$out_abs/files"
    find . -type f -print0 |
      sort -z |
      xargs -0 sha256sum
  ) > "$out_abs/MANIFEST.sha256"
else
  : > "$out_abs/MANIFEST.sha256"
fi

printf 'repository snapshot prepared: %s\n' "$out_abs"
