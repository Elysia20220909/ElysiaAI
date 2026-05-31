#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   chmod +x setup-signing.sh && ./setup-signing.sh
#   ./setup-signing.sh gpg
#
# Defaults to SSH commit signing and stores all Git settings locally in this
# repository. Existing pre-commit hooks are preserved and chained.

SIGN_METHOD=${1:-ssh}
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

echo "Setting up commit signing (method=$SIGN_METHOD) in repo: $REPO_ROOT"

if ! git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: setup-signing.sh must be run inside a Git repository."
  exit 1
fi

git_path() {
  path=$(git -C "$REPO_ROOT" rev-parse --git-path "$1")
  case "$path" in
    /* | [A-Za-z]:/*)
      printf '%s\n' "$path"
      ;;
    *)
      printf '%s/%s\n' "$REPO_ROOT" "$path"
      ;;
  esac
}

install_pre_commit_guard() {
  hook=$(git_path hooks/pre-commit)
  hook_dir=$(dirname "$hook")
  mkdir -p "$hook_dir"

  if [ -f "$hook" ] && grep -Fq "setup-signing.sh: begin commit signing guard" "$hook"; then
    chmod +x "$hook"
    echo "pre-commit signing guard is already installed."
    return
  fi

  tmp="${hook}.tmp.$$"
  cat > "$tmp" <<'HOOK'
#!/bin/sh
# setup-signing.sh: begin commit signing guard
if [ "$(git config --local --get commit.gpgSign)" != "true" ]; then
  echo "ERROR: commit.gpgSign is not true. Aborting commit."
  exit 1
fi
# setup-signing.sh: end commit signing guard
HOOK

  if [ -f "$hook" ]; then
    preserved="${hook}.setup-signing-preserved"
    if [ -e "$preserved" ]; then
      preserved="${hook}.setup-signing-preserved.$(date +%Y%m%d%H%M%S)"
    fi
    preserved_name=$(basename "$preserved")
    cp "$hook" "$preserved"
    {
      printf '\npreserved_hook="$(dirname "$0")/%s"\n' "$preserved_name"
      printf 'if [ -x "$preserved_hook" ]; then\n'
      printf '  "$preserved_hook" "$@"\n'
      printf 'else\n'
      printf '  echo "Existing pre-commit hook preserved but not executable: $preserved_hook"\n'
      printf 'fi\n'
    } >> "$tmp"
    echo "Existing pre-commit hook preserved and chained: $preserved"
  fi

  mv "$tmp" "$hook"
  chmod +x "$hook"
}

case "$SIGN_METHOD" in
  ssh)
    KEY="$HOME/.ssh/id_ed25519"
    PUB="$KEY.pub"

    if [ ! -f "$KEY" ]; then
      email=$(git -C "$REPO_ROOT" config user.email || true)
      comment=${email:-git-signing}
      echo "Generating an ed25519 SSH key (no passphrase for quick onboarding)..."
      mkdir -p "$HOME/.ssh"
      ssh-keygen -t ed25519 -f "$KEY" -N "" -C "$comment"
    fi

    if [ ! -f "$PUB" ]; then
      echo "Public key not found; deriving it from the private key..."
      ssh-keygen -y -f "$KEY" > "$PUB"
    fi

    git -C "$REPO_ROOT" config --local gpg.format ssh
    git -C "$REPO_ROOT" config --local user.signingkey "$PUB"
    git -C "$REPO_ROOT" config --local commit.gpgSign true

    install_pre_commit_guard

    if command -v gh >/dev/null 2>&1; then
      host=$(hostname 2>/dev/null || echo local)
      echo "Adding SSH public key to your GitHub account as a signing key (via gh)..."
      gh ssh-key add "$PUB" --title "signing-key-$host-$(date +%s)" --type signing \
        || echo "gh failed: add key manually at https://github.com/settings/keys -> New SSH key -> type: Signing"
    else
      echo "Please add $PUB to GitHub: Settings -> SSH and GPG keys -> New SSH key -> Key type: Signing"
    fi

    echo "Done. Make a signed commit with git commit -m 'msg', push, and check GitHub shows 'Verified'."
    ;;

  gpg)
    echo "GPG path selected. See brief instructions below."
    echo "1) Generate (interactive): gpg --full-generate-key"
    echo "2) Get key ID: gpg --list-secret-keys --keyid-format=long"
    echo "3) Tell git: git config --local gpg.format openpgp ; git config --local user.signingkey <KEYID> ; git config --local commit.gpgSign true"
    echo "4) Export public and add to GitHub: gpg --armor --export <KEYID>"
    echo "5) GitHub: Settings -> SSH and GPG keys -> New GPG key"
    ;;

  *)
    echo "Usage: ./setup-signing.sh [ssh|gpg]"
    exit 2
    ;;
esac
