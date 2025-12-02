#!/usr/bin/env bash
# SSH Secure Setup (Ubuntu/Debian)
# - Generates an Ed25519 key
# - Adds public key to server user
# - Hardens sshd_config

set -euo pipefail

USER_NAME=${1:-elysia}
SSH_DIR="/home/${USER_NAME}/.ssh"
AUTHORIZED_KEYS="${SSH_DIR}/authorized_keys"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash ./scripts/ssh-setup.sh <user>"
  exit 1
fi

# Create user if missing
if ! id "${USER_NAME}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${USER_NAME}"
fi

mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"
chown -R "${USER_NAME}:${USER_NAME}" "${SSH_DIR}"

# Generate local key (client side instruction)
cat << 'EOF'
[Client] Generate SSH key on your workstation:

  ssh-keygen -t ed25519 -a 100 -f ~/.ssh/elysia_ai -C "elysia-ai"
  # Then copy public key content:
  cat ~/.ssh/elysia_ai.pub

Paste the public key below and press Ctrl+D:
EOF

PUBKEY=$(cat)

if [ -z "${PUBKEY}" ]; then
  echo "No public key provided"
  exit 1
fi

echo "${PUBKEY}" >> "${AUTHORIZED_KEYS}"
chmod 600 "${AUTHORIZED_KEYS}"
chown "${USER_NAME}:${USER_NAME}" "${AUTHORIZED_KEYS}"

# Harden sshd_config
SSHD_CONF="/etc/ssh/sshd_config"
cp "${SSHD_CONF}" "${SSHD_CONF}.bak.$(date +%Y%m%d%H%M%S)"

apply_conf() {
  local key="$1"; shift
  local value="$*"
  if grep -qi "^#\?${key} " "${SSHD_CONF}"; then
    sed -i "s/^#\?${key}.*/${key} ${value}/I" "${SSHD_CONF}"
  else
    echo "${key} ${value}" >> "${SSHD_CONF}"
  fi
}

apply_conf PermitRootLogin prohibit-password
apply_conf PasswordAuthentication no
apply_conf PubkeyAuthentication yes
apply_conf KbdInteractiveAuthentication no
apply_conf ChallengeResponseAuthentication no
apply_conf X11Forwarding no
apply_conf AllowUsers "${USER_NAME}"
apply_conf ClientAliveInterval 300
apply_conf ClientAliveCountMax 2
apply_conf MaxAuthTries 3

# Restart ssh service
systemctl restart ssh || systemctl restart sshd || true

echo "✅ SSH hardened and key installed for user ${USER_NAME}"
echo "Test from client: ssh -i ~/.ssh/elysia_ai ${USER_NAME}@<server-ip>"
