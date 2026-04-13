#!/bin/bash

# 🌸 ElysiaAI Lightweight Secret Scanner
# A fast, regex-based scanner to detect hardcoded keys and secrets.

echo "🔍 Scanning for secrets and hardcoded keys..."

DANGEROUS_PATTERNS=(
    "sk-(proj-)?[a-zA-Z0-9_-]{48,}"         # OpenAI (Legacy & Project)
    "AIza[0-9A-Za-z\\-_]{35}"    # Google Cloud
    "gh[p|o|u|s|r]_[a-zA-Z0-9]{36,255}" # GitHub
    "ey[a-zA-Z0-9._-]{10,}"      # Potential JWT/Bearer
    "(\"|')?[a-zA-Z0-9_-]{32,}(\"|')?" # General 32+ char strings
)

FAILED=0

# Scan JS/TS/JSON files, excluding node_modules and docs
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    FOUND=$(grep -rE "$pattern" . --exclude-dir={node_modules,dist,.git,docs,logs} --include=\*.{ts,js,json,yml,yaml} | grep -v "example" | grep -v "test")
    if [ ! -z "$FOUND" ]; then
        echo "⚠️ Potential secret detected for pattern: $pattern"
        echo "$FOUND"
        FAILED=1
    fi
done

if [ $FAILED -eq 1 ]; then
    echo "❌ Secret scan failed. Please move secrets to .env files."
    exit 1
else
    echo "✅ No secrets detected in codebase."
    exit 0
fi
