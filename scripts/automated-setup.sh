#!/usr/bin/env bash

# ------------------------------------------------------------
# automated-setup.sh – One‑click full ElysiaAI environment setup
# ------------------------------------------------------------
# This script is intended for a fresh Debian/Ubuntu (or WSL2) system.
# It performs the following steps:
#   1. Install core system packages (curl, gnupg, git, build‑essential).
#   2. Install Bun (JavaScript runtime) and Python 3.11.
#   3. Create a Python virtual environment and install Python deps.
#   4. Install Node/Bun dependencies (bun install).
#   5. Run the comprehensive security hardening script
#      (complete-security-setup.sh).
#   6. Copy the example .env file, generate a random secret for any
#      placeholders, and guide the user to review the .env.
#   7. Boot the application (make boot) and verify that the services
#      start correctly.
#
# The script is idempotent – repeated runs will detect already‑installed
# components and skip them. It must be executed with sudo (or as root).
# ------------------------------------------------------------

set -euo pipefail

# ---- Helper functions ------------------------------------------------
require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "[ERROR] This script must be run as root (or with sudo)." >&2
    exit 1
  fi
}

log() {
  echo "[INFO] $*"
}

install_pkg() {
  local pkg=$1
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    log "Installing $pkg..."
    apt-get update -qq && apt-get install -y "$pkg"
  else
    log "$pkg already installed."
  fi
}

# ---- 1. Core system packages ------------------------------------------
install_core_packages() {
  log "Installing core system packages..."
  install_pkg curl
  install_pkg gnupg
  install_pkg git
  install_pkg ca-certificates
  install_pkg build-essential
  install_pkg libssl-dev
  install_pkg python3-venv
  install_pkg python3-pip
}

# ---- 0. Prerequisite checks --------------------------------------------
check_prereqs() {
  log "Checking required commands..."
  for cmd in python3 pip make docker docker-compose; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      log "Installing missing prerequisite: $cmd"
      case $cmd in
        python3)   apt-get install -y python3 python3-venv python3-pip ;;
        pip)       apt-get install -y python3-pip ;;
        make)      apt-get install -y make ;;
        docker)    apt-get install -y docker.io ;;
        docker-compose) apt-get install -y docker-compose-plugin ;;
      esac
    else
      log "$cmd is already available."
    fi
  done
}

# ---- 2. Install Bun ---------------------------------------------------
install_bun() {
  if command -v bun >/dev/null 2>&1; then
    log "Bun already installed."
    return
  fi
  log "Installing Bun (v1.x)..."
  curl -fsSL https://bun.sh/install | bash
  # Ensure the profile is reloaded for the current session
  export PATH="$HOME/.bun/bin:$PATH"
}

# ---- 3. Python virtual environment -------------------------------------
setup_python_venv() {
  # If .venv exists but is incompatible (e.g. created on Windows but running in Linux), recreate it.
  if [[ -d .venv ]] && [[ ! -f .venv/bin/activate ]]; then
    log ".venv appears incompatible (Windows style in Linux). Recreating..."
    rm -rf .venv
  fi

  if [[ ! -d .venv ]]; then
    log "Creating Python virtual environment..."
    python3 -m venv .venv
  fi
  # Always update/install dependencies
  log "Installing/updating Python dependencies..."
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  deactivate
}

# ---- 4. Bun dependencies -----------------------------------------------
install_bun_deps() {
  log "Installing Bun (JavaScript) dependencies..."
  bun install
}

# ---- 5. Run full security hardening -----------------------------------
run_security_hardening() {
  log "Running complete-security-setup.sh..."
  chmod +x ./scripts/complete-security-setup.sh
  bash ./scripts/complete-security-setup.sh
}

# ---- 6. Prepare .env ---------------------------------------------------
prepare_env() {
  if [[ -f .env ]]; then
    log ".env already exists – skipping copy."
    return
  fi
  if [[ -f .env.example ]]; then
    cp .env.example .env
    # Replace any placeholder secrets with random values
    if grep -q "YOUR_SECRET" .env; then
      local secret=$(openssl rand -base64 32)
      sed -i "s/YOUR_SECRET/$secret/" .env
    fi
    log ".env created from .env.example. Please review it before starting the app."
  else
    log "WARNING: .env.example not found – you must create .env manually."
  fi
}

# ---- 6b. Docker containers start ----------------------------------------
start_containers() {
  log "Starting Docker Compose services..."
  docker compose pull
  docker compose up -d
}


# ---- 7. Boot the application -------------------------------------------
boot_application() {
  log "Booting ElysiaAI (make boot)..."
  make boot
}

# ---- Main execution ---------------------------------------------------
require_root
check_prereqs
install_core_packages
install_bun
setup_python_venv
install_bun_deps
run_security_hardening
prepare_env
start_containers
boot_application

log "Automated setup completed successfully!"
