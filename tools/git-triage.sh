#!/usr/bin/env bash
set -u

repo_name="$(basename "$(pwd)")"
timestamp="$(date +%Y%m%d-%H%M%S)"
out="git-triage-${repo_name}-${timestamp}.txt"

current_branch() {
	git rev-parse --abbrev-ref HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null
}

redact_sensitive() {
	sed -E \
		-e 's#(https?://)[^/@[:space:]]+@#\1<redacted>@#g' \
		-e 's#(https?://[^/:[:space:]]+):[^/@[:space:]]+@#\1:<redacted>@#g' \
		-e 's#([?&](access_token|token)=)[^&[:space:]]+#\1<redacted>#Ig' \
		-e 's#^((GIT|GH|GITHUB|NETRC|CREDENTIAL|SSH_AUTH_SOCK)[A-Z0-9_]*=).*#\1<set>#'
}

run_redacted() {
	"$@" 2>&1 | redact_sensitive || true
}

{
	echo "=== repo: ${repo_name}"
	echo "=== run at: $(date -u '+%Y-%m-%dT%H:%M:%SZ') (UTC)"
	echo "=== git version: $(git --version 2>/dev/null)"
	echo "=== branch: $(current_branch)"
	echo "=== git status ==="
	git status --porcelain=2 --branch 2>/dev/null || true
	echo "=== branch -vv ==="
	git branch -vv 2>/dev/null || true
	echo "=== remote -v ==="
	run_redacted git remote -v
	echo "=== remote show origin ==="
	run_redacted git remote show origin
	echo "=== ls-remote origin (heads + tags) ==="
	git ls-remote --heads --tags origin 2>/dev/null || true
	echo "=== fetch --all --prune (attempt, non-fatal) ==="
	git fetch --all --prune >/dev/null 2>&1 || true
	echo "=== origin log (head) ==="
	branch="$(current_branch)"
	git log --oneline -n 30 "origin/${branch}" 2>/dev/null || echo "no origin/branch or fetch failed"
	echo "=== local log (latest 50) ==="
	git log --oneline -n 50 2>/dev/null || true
	echo "=== reflog (latest 200) ==="
	git reflog --no-abbrev -n 200 2>/dev/null || true
	echo "=== show-ref (all refs) ==="
	git show-ref 2>/dev/null || true
	echo "=== for-each-ref (human dates) ==="
	git for-each-ref --format='%(refname:short) %(objectname) %(authordate:iso8601)' refs/heads refs/remotes refs/tags 2>/dev/null || true
	echo "=== fsck --lost-found (first 200 lines) ==="
	git fsck --no-progress --lost-found 2>&1 | sed -n '1,200p' || true
	echo "=== credential helpers ==="
	git config --get-all credential.helper 2>/dev/null || true
	echo "=== Git / GH environment hints (values redacted) ==="
	env | grep -E '^(GIT|GH|GITHUB|NETRC|CREDENTIAL|SSH_AUTH_SOCK)' 2>/dev/null | redact_sensitive || true
	echo "=== end ==="
} | tee "${out}"

echo "WROTE ${out}"
