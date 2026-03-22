#!/usr/bin/env bash
# Elysia AI - Full Production Setup (Linux/Ubuntu)
# Run as root: sudo bash ./scripts/setup-production.sh

set -euo pipefail

echo "🌸 Elysia AI - Production Setup Starting..."

# Variables
DEPLOY_USER=${DEPLOY_USER:-elysia}
DEPLOY_DIR=${DEPLOY_DIR:-/opt/elysia-ai}
DOMAIN=${DOMAIN:-}

# Check root
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root: sudo bash ./scripts/setup-production.sh"
  exit 1
fi

# 1. System packages
echo "📦 Installing system packages..."
apt update
apt install -y curl git build-essential python3 python3-pip python3-venv jq nginx certbot python3-certbot-nginx redis-server ufw fail2ban

# 2. Install Bun for deploy user
echo "🔧 Installing Bun..."
if ! command -v bun &>/dev/null; then
  sudo -u "${DEPLOY_USER}" bash -c 'curl -fsSL https://bun.sh/install | bash'
fi

# 3. Create deploy user
echo "👤 Creating deploy user: ${DEPLOY_USER}..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -r -m -s /bin/bash -d "${DEPLOY_DIR}" "${DEPLOY_USER}"
fi

# 4. Copy project to deploy directory
echo "📁 Copying project to ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
rsync -a --exclude=node_modules --exclude=.venv --exclude=data "$(pwd)/" "${DEPLOY_DIR}/"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_DIR}"

# 5. Install dependencies
echo "📚 Installing dependencies..."
cd "${DEPLOY_DIR}"
sudo -u "${DEPLOY_USER}" bash -c 'source ~/.bashrc; bun install'
sudo -u "${DEPLOY_USER}" bash ./scripts/setup-python.sh

# 6. Setup .env
echo "🔐 Setting up .env..."
if [ ! -f "${DEPLOY_DIR}/.env" ]; then
  cp "${DEPLOY_DIR}/.env.example" "${DEPLOY_DIR}/.env"
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  AUTH_PASSWORD=$(openssl rand -base64 24)
  
  {
    echo "JWT_SECRET=${JWT_SECRET}"
    echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
    echo "AUTH_USERNAME=elysia"
    echo "AUTH_PASSWORD=${AUTH_PASSWORD}"
    echo "REDIS_ENABLED=true"
    echo "REDIS_URL=redis://localhost:6379"
    echo "PORT=3000"
  } >> "${DEPLOY_DIR}/.env"
  
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_DIR}/.env"
  chmod 600 "${DEPLOY_DIR}/.env"
  
  echo "✅ Generated credentials saved to ${DEPLOY_DIR}/.env"
  echo "AUTH_USERNAME=elysia"
  echo "AUTH_PASSWORD=${AUTH_PASSWORD}"
fi

# 7. Redis
echo "🔴 Starting Redis..."
systemctl enable redis-server
systemctl start redis-server

# 8. systemd services
echo "⚙️ Creating systemd services..."

cat > /etc/systemd/system/elysia-fastapi.service << EOF
[Unit]
Description=Elysia FastAPI RAG Server
After=network.target redis-server.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${DEPLOY_DIR}
Environment="PATH=${DEPLOY_DIR}/.venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=${DEPLOY_DIR}/.venv/bin/python ${DEPLOY_DIR}/python/fastapi_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/elysia-server.service << EOF
[Unit]
Description=Elysia AI Server
After=network.target elysia-fastapi.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${DEPLOY_DIR}
Environment="PATH=/home/${DEPLOY_USER}/.bun/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/${DEPLOY_USER}/.bun/bin/bun run ${DEPLOY_DIR}/src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable elysia-fastapi elysia-server
systemctl start elysia-fastapi elysia-server

# 9. Nginx
echo "🌐 Setting up Nginx..."
cp "${DEPLOY_DIR}/deploy/nginx.conf.example" /etc/nginx/sites-available/elysia-ai

if [ -n "${DOMAIN}" ]; then
  sed -i "s/server_name .*;/server_name ${DOMAIN};/" /etc/nginx/sites-available/elysia-ai
  ln -sf /etc/nginx/sites-available/elysia-ai /etc/nginx/sites-enabled/
  nginx -t && systemctl restart nginx
  
  echo "🔒 Obtaining TLS certificate..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" || echo "⚠️ Certbot failed, configure manually"
else
  echo "⚠️ DOMAIN not set, skipping Nginx config. Set DOMAIN env var and re-run."
fi

# 10. Firewall
echo "🔥 Setting up firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 6379/tcp

# 11. JSONL rotation cron
echo "📅 Setting up JSONL rotation..."
cat > /etc/cron.daily/elysia-jsonl-rotate << 'EOF'
#!/bin/bash
cd /opt/elysia-ai
./scripts/rotate-jsonl.sh data 50
EOF
chmod +x /etc/cron.daily/elysia-jsonl-rotate

# 12. fail2ban
echo "🛡️ Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "✨✨✨ Elysia AI Production Setup Complete! ✨✨✨"
echo ""
echo "📊 Service Status:"
systemctl status elysia-fastapi --no-pager -l
systemctl status elysia-server --no-pager -l
echo ""
echo "🔐 Credentials (saved to ${DEPLOY_DIR}/.env):"
echo "   AUTH_USERNAME: elysia"
grep AUTH_PASSWORD "${DEPLOY_DIR}/.env" || true
echo ""
echo "🌐 Access:"
if [ -n "${DOMAIN}" ]; then
  echo "   https://${DOMAIN}/ping"
else
  echo "   http://localhost:3000/ping"
fi
echo ""
echo "📝 Next steps:"
echo "   1. Test: curl -s http://localhost:3000/ping | jq ."
echo "   2. SSH hardening: sudo bash ./scripts/ssh-setup.sh ${DEPLOY_USER}"
echo "   3. Monitor logs: sudo journalctl -u elysia-server -f"
