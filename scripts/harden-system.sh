#!/bin/bash

# 🌸 ElysiaAI System Hardening Script
# Addresses released/operational security requirements.

echo "🛡️ Starting Sovereign System Hardening..."

# 1. Database Protection
if [ -f "dev.db" ]; then
    echo "📦 Securing SQLite database (dev.db)..."
    chmod 600 dev.db
    echo "✅ Permissions set to 600 (Owner Read/Write only)."
else
    echo "⚠️ dev.db not found in root. Skipping database hardening."
fi

# 2. Environmental Integrity
if [ ! -f ".env" ]; then
    echo "❌ CRITICAL: .env file is missing! System cannot operate securely."
    exit 1
else
    echo "✅ .env file detected."
fi

# 3. Directory Hardening
DIRECTORIES=("config/private" "packages/server/logs" "backups")
for dir in "${DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
        echo "📂 Hardening directory: $dir"
        chmod 700 "$dir"
    fi
done

# 4. Dependency Audit
echo "🧪 Running Dependency Audit..."
bun pm audit

# 5. Secret Scan
echo "🔍 Running Secret Scan..."
bash scripts/scan-secrets.sh

echo "✨ Hardening complete. ElysiaAI is now in 'Sovereign' state."
