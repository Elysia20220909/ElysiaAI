#!/bin/bash

# 🛡️ ElysiaAI - Sovereign SSH Hardening Script
# Target: Ubuntu 26.04 LTS

set -e

echo "🔒 [1/3] Configuring UFW (Firewall)..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Elysia API
sudo ufw allow 8080/tcp  # Nitter
sudo ufw --force enable

echo "🛡️ [2/3] Hardening SSH Config..."
# Backup original config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Update settings: Disable password login, allow only key-based
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

echo "🔄 [3/3] Restarting SSH Service..."
sudo systemctl restart ssh

echo "=========================================="
echo "✅ SOVEREIGN SECURITY HARDENED"
echo "=========================================="
echo "SSH Password authentication is now DISABLED."
echo "Ensure your public key is in ~/.ssh/authorized_keys before logging out!"
echo "=========================================="
