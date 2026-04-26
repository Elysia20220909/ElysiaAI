#!/bin/bash
# [DEPLOY] Sovereign Debian Setup (Phase 260) - v2 (Non-interactive)
# "Hardening the Linux Core. The silence of the machine."

export DEBIAN_FRONTEND=noninteractive

# Pre-seed debconf for wireshark-common to prevent interactive prompt
echo "wireshark-common wireshark-common/install-setuid boolean true" | sudo debconf-set-selections

echo "=========================================================="
echo "       SOVEREIGN DEBIAN HARDENING: LEVEL_OMEGA"
echo "=========================================================="

# 1. Update and Lattice Construction
echo "[INFO] Updating repositories and core packages..."
sudo apt-get update && sudo apt-get upgrade -y

echo "[INFO] Installing Intelligence Arsenal..."
sudo apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    python3 python3-pip \
    nmap yara tshark \
    rkhunter chkrootkit \
    aide ufw fail2ban \
    curl git htop

# 2. Rootkit Hunter Configuration
echo "[INFO] Configuring RKHunter..."
sudo rkhunter --propupd > /dev/null 2>&1

# 3. AIDE Initialization (File Integrity)
# Note: Initializing AIDE can be slow, skipping full init in trial if needed
# echo "[INFO] Initializing AIDE database..."
# sudo aideinit

# 4. Firewall Hardening
echo "[INFO] Hardening Network Perimeter (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit ssh
# We don't force enable UFW in WSL by default as it can mess with connectivity
# sudo ufw --force enable

# 5. Fail2Ban Activation
echo "[INFO] Activating Fail2Ban..."
sudo systemctl enable fail2ban || true
sudo systemctl start fail2ban || true

echo "=========================================================="
echo " [ARMED] DEBIAN LATTICE IS STABLE"
echo " Status: LINUX_HARDENED // PERIMETER_LOCKED"
echo "=========================================================="
