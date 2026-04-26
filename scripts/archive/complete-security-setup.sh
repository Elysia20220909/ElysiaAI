#!/usr/bin/env bash

# ------------------------------------------------------------
# complete-security-setup.sh
# ------------------------------------------------------------
# This script runs a full security hardening routine on a Debian/Ubuntu
# system (including WSL2). It installs and configures:
#   * UFW firewall (with recommended ports)
#   * Fail2Ban (SSH brute‑force protection)
#   * Automatic security updates (unattended‑updates)
#   * Logwatch for daily log reports
#   * Lynis security audit (generates a report)
#   * SSL certificate via Certbot (if a domain is supplied)
#   * Backup script creation (calls ./scripts/backup-setup.sh)
#   * SSH hardening recommendations
# ------------------------------------------------------------

set -euo pipefail

# ---- Configuration -------------------------------------------------
ALLOWED_PORTS=(22 80 443 3000 5432 6379)   # SSH, HTTP, HTTPS, Elysia, PostgreSQL, Redis
SSL_DOMAIN="${SSL_DOMAIN:-}"               # optional; if empty, SSL step is skipped
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@example.com}"

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------
require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "[ERROR] This script must be run as root (or with sudo)." >&2
    exit 1
  fi
}

install_pkg() {
  local pkg=$1
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    echo "[INFO] Installing $pkg..."
    apt-get update -qq && apt-get install -y "$pkg"
  else
    echo "[INFO] $pkg already installed."
  fi
}

is_wsl() {
  grep -qi microsoft /proc/version
}

has_systemd() {
  [[ $(ps -p 1 -o comm=) == "systemd" ]]
}

setup_ufw() {
  echo "[INFO] Configuring UFW firewall..."
  if is_wsl; then
    echo "[WARNING] WSL detected. UFW is often unreliable in WSL (SSH check errors). Skipping firewall setup."
    return
  fi
  install_pkg ufw
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  for p in "${ALLOWED_PORTS[@]}"; do
    ufw allow "${p}/tcp"
  done
  ufw enable
  echo "[INFO] UFW status:" && ufw status verbose
}

setup_fail2ban() {
  echo "[INFO] Setting up Fail2Ban for SSH protection..."
  if ! has_systemd; then
    echo "[WARNING] systemd not detected. Fail2Ban requires systemd to manage jails. Skipping."
    return
  fi
  install_pkg fail2ban
  local jail_file="/etc/fail2ban/jail.local"
  if [[ ! -f $jail_file ]]; then
    cat > "$jail_file" <<'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF
  fi
  systemctl restart fail2ban
  echo "[INFO] Fail2Ban status:" && fail2ban-client status sshd
}

setup_updates() {
  echo "[INFO] Enabling unattended‑updates..."
  if ! has_systemd; then
    echo "[WARNING] systemd not detected. unattended‑updates service requires systemd. Skipping configuration."
    return
  fi
  install_pkg unattended-upgrades apt-listchanges
  dpkg-reconfigure -plow unattended-upgrades
  echo 'Unattended-Upgrade::Automatic-Reboot "true";' >> /etc/apt/apt.conf.d/50unattended-upgrades
  echo 'Unattended-Upgrade::Automatic-Reboot-Time "03:30";' >> /etc/apt/apt.conf.d/50unattended-upgrades
}

setup_logwatch() {
  echo "[INFO] Installing Logwatch for daily log summaries..."
  if ! has_systemd; then
    echo "[WARNING] systemd not detected. Logwatch service management skipped."
  fi
  install_pkg logwatch
  if [[ ! -f /etc/logwatch/conf/logwatch.conf ]]; then
    cp /usr/share/logwatch/default.conf/logwatch.conf /etc/logwatch/conf/logwatch.conf
  fi
  sed -i 's/^MailTo = .*/MailTo = root/' /etc/logwatch/conf/logwatch.conf
  if has_systemd; then
    systemctl enable logwatch.service || true
  fi
}

run_lynis() {
  echo "[INFO] Running Lynis security audit..."
  install_pkg lynis
  lynis audit system > /var/log/lynis-report.txt
  echo "[INFO] Lynis report saved at /var/log/lynis-report.txt"
}

obtain_ssl() {
  if [[ -z "$SSL_DOMAIN" ]]; then
    echo "[SKIP] No SSL_DOMAIN supplied – skipping Certbot step."
    return
  fi
  echo "[INFO] Installing Certbot for domain $SSL_DOMAIN..."
  install_pkg certbot
  install_pkg python3-certbot-nginx
  if command -v nginx >/dev/null 2>&1; then
    certbot --nginx -d "$SSL_DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL"
  else
    certbot certonly --standalone -d "$SSL_DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL"
  fi
  echo "[INFO] SSL certificate obtained. Automatic renewal is handled by systemd timer."
}

run_backup_setup() {
  echo "[INFO] Creating backup script (./scripts/backup-setup.sh)..."
  if [[ -f ./scripts/backup-setup.sh ]]; then
    echo "[INFO] backup-setup.sh already exists – skipping creation."
    return
  fi
  cat > ./scripts/backup-setup.sh <<'EOS'
#!/usr/bin/env bash
# Simple daily backup for ElysiaAI – stores backups under /backup
set -euo pipefail
BACKUP_DIR="/backup/elysia-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
# PostgreSQL dump (adjust credentials as needed)
PGPASSWORD=${PGPASSWORD:-} pg_dump -h localhost -U elysia_user elysia_ai | gzip > "$BACKUP_DIR/db_backup.sql.gz"
# Application files (exclude heavy dirs)
tar -czf "$BACKUP_DIR/app_backup.tar.gz" /opt/elysia-ai --exclude=node_modules --exclude=.git
# Uploads
tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" /opt/elysia-ai/uploads
# Cleanup old backups (>30d)
find /backup -type d -mtime +30 -exec rm -rf {} + || true
EOS
  chmod +x ./scripts/backup-setup.sh
  (crontab -l 2>/dev/null; echo "0 2 * * * $(realpath ./scripts/backup-setup.sh)") | crontab -
  echo "[INFO] Backup script installed and scheduled."
}

# ------------------------------------------------------------
# Main execution
# ------------------------------------------------------------
require_root
setup_ufw
setup_fail2ban
setup_updates
setup_logwatch
run_lynis
obtain_ssl
run_backup_setup

echo "[SUCCESS] Complete security hardening finished."
