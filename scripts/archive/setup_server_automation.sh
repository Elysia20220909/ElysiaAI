#!/bin/bash

# 🌸 ElysiaAI - Sovereign Infrastructure Setup Script
# Target: Ubuntu 26.04 LTS "Resolute Raccoon"
# Optimized for: Beautiful Structure (Refactored Root)

set -e

echo "🚀 [1/6] Preparing the Soil (Dependencies)..."
sudo apt-get update && sudo apt-get install -y \
    docker.io \
    docker-compose \
    python3-pip \
    python3-venv \
    curl \
    unzip \
    build-essential

echo "📦 [2/6] Summoning Bun Runtime..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
fi

echo "🪐 [3/6] Starting Sovereign Support Nodes (Nitter)..."
cd "$(dirname "$0")/../deploy/nitter"
sudo docker-compose up -d

echo "🧬 [4/6] Initializing AI Kernel Environment..."
cd ../..
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

echo "💾 [5/6] Ensuring Sovereign Memory (Data Storage)..."
mkdir -p data
# Ensure correct permissions for the local volume
sudo chown -R $USER:$USER data/

echo "🛡️ [6/6] Registering Sovereign Services (Systemd)..."

# 1. Main AI Kernel & API Gateway Service
cat <<EOF | sudo tee /etc/systemd/system/elysia-core.service
[Unit]
Description=ElysiaAI Core Service (Bun + Python Kernel)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/.venv/bin:$PATH:$HOME/.bun/bin
ExecStart=$(which bun) run server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. Automation Monitor Service
cat <<EOF | sudo tee /etc/systemd/system/elysia-monitor.service
[Unit]
Description=ElysiaAI Marathon Hook Monitor
After=network.target elysia-core.service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/.venv/bin/python $(pwd)/scripts/marathon_hook_monitor.py
EOF

# 3. Automation Timer
cat <<EOF | sudo tee /etc/systemd/system/elysia-monitor.timer
[Unit]
Description=Run ElysiaAI Monitor every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now elysia-core.service
sudo systemctl enable --now elysia-monitor.timer

echo "🔑 [7/7] Initializing Sovereign Identity (Twscrape)..."
mkdir -p config
cat <<EOF > config/x_credentials.json
{
  "accounts": [
    {
      "username": "elysia_sentinel_01",
      "password": "Sovereign_Alpha_2026!",
      "email": "sentinel01@example.com",
      "email_password": "Sentinel_Mail_Pass_123"
    }
  ]
}
EOF

# Use a small python helper to register the accounts
source .venv/bin/activate
python3 <<EOF
import json
import subprocess
import os

try:
    with open('config/x_credentials.json') as f:
        data = json.load(f)
    
    for acc in data['accounts']:
        print(f"Registering {acc['username']}...")
        cmd = f"twscrape add_accounts {acc['username']} {acc['password']} {acc['email']} {acc['email_password']}"
        subprocess.run(cmd.split(), capture_output=True)
    
    print("Attempting to login to all accounts...")
    subprocess.run(["twscrape", "login_all"], capture_output=True)
except Exception as e:
    print(f"Twscrape Init Warning: {e}")
EOF

echo "=========================================="
echo "✅ SOVEREIGN DEPLOYMENT COMPLETE"
echo "=========================================="
echo "- Main API: http://localhost:3000"
echo "- Self-hosted Nitter: http://localhost:8080"
echo "- Core Service: systemctl status elysia-core"
echo "- Automation Logs: journalctl -u elysia-monitor"
echo "- X Credentials: edit config/x_credentials.json"
echo "=========================================="
echo "Welcome to Ubuntu 26.04, Elysia."
