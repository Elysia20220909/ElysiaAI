#!/usr/bin/env bash

# ------------------------------------------------------------
# Firewall & SSL Automated Setup for ElysiaAI
# ------------------------------------------------------------
# This script configures a basic UFW firewall, installs Certbot,
# and obtains/renews an SSL certificate for the provided domain.
# It is intended to be run on a Debian/Ubuntu based system (WSL2
# or a production VM). Adjust ports/domains as needed.
# ------------------------------------------------------------

set -euo pipefail

# ---- Configuration -------------------------------------------------
# Define the ports you want to allow (space‑separated list).
ALLOWED_PORTS=(22 80 443 3000 5432 6379)   # SSH, HTTP, HTTPS, Elysia, PostgreSQL, Redis

# Domain for SSL certificate – can be overridden via env var.
# Example: export SSL_DOMAIN=example.com && ./firewall-ssl-setup.sh
SSL_DOMAIN="${SSL_DOMAIN:-}"   # leave empty to prompt interactively

# Email address for Certbot notifications (required by Let's Encrypt).
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@example.com}"

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------
function require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "[ERROR] This script must be run as root (or with sudo)." >&2
    exit 1
  fi
}

function install_package() {
  local pkg=$1
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    echo -e "\n[INFO] Installing $pkg..."
    apt-get update -qq && apt-get install -y "$pkg"
  else
    echo -e "\n[INFO] $pkg already installed."
  fi
}

function setup_ufw() {
  echo -e "\n[INFO] Setting up UFW firewall..."
  install_package ufw
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  for p in "${ALLOWED_PORTS[@]}"; do
    ufw allow "$p/tcp"
  done
  ufw enable
  echo -e "\n[INFO] UFW status:" && ufw status verbose
}

function obtain_ssl() {
  # Ensure domain is provided
  if [[ -z "$SSL_DOMAIN" ]]; then
    read -rp "Enter the domain name for the SSL certificate (e.g., yourdomain.com): " SSL_DOMAIN
  fi
  if [[ -z "$SSL_DOMAIN" ]]; then
    echo "[ERROR] No domain supplied – aborting SSL setup." >&2
    exit 1
  fi

  echo -e "\n[INFO] Installing Certbot (Let's Encrypt)..."
  install_package certbot
  install_package python3-certbot-nginx

  # Detect if Nginx is present – use nginx plugin if so, otherwise use standalone.
  if command -v nginx >/dev/null 2>&1; then
    echo "[INFO] Nginx detected – using certbot nginx plugin."
    certbot --nginx -d "$SSL_DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL"
  else
    echo "[INFO] Nginx not detected – using standalone mode."
    # Standalone requires port 80 to be free.
    certbot certonly --standalone -d "$SSL_DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL"
    # Optionally, you can hook this into your own web server configuration.
  fi

  echo -e "\n[INFO] SSL certificate obtained for $SSL_DOMAIN."
  echo "[INFO] Certbot sets up automatic renewal via systemd timer."
}

# ------------------------------------------------------------
# Main execution
# ------------------------------------------------------------
require_root
setup_ufw
obtain_ssl

echo -e "\n[SUCCESS] Firewall configured and SSL certificate set up."
