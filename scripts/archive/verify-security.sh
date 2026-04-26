#!/bin/bash
# ==================== ElysiaAI Security Verification Script ====================
# This script runs within the security-sandbox container to simulate brute-force
# attacks on the core server and verify defense logging and rate-limiting.

TARGET_HOST="app"
TARGET_PORT="3000"
TARGET_URL="/auth/token"
USER_NAME="elysia"
WORDLIST="/sandbox/scripts/wordlists/passwords.txt"

echo "🛡️ Starting Sovereign Security Simulation..."
echo "Target: http://${TARGET_HOST}:${TARGET_PORT}${TARGET_URL}"
echo "User: ${USER_NAME}"
echo "--------------------------------------------------------"

# Using Hydra for JSON POST Brute-force
# Format: url:post_body:fail_condition:headers
echo "Running Hydra Brute-force simulation..."
hydra -l "${USER_NAME}" -P "${WORDLIST}" "${TARGET_HOST}" http-post-form \
  "${TARGET_URL}:{\"username\":\"^USER^\",\"password\":\"^PASS^\"}:F=Invalid credentials:H=Content-Type: application/json" \
  -s "${TARGET_PORT}" -vV -f

echo "--------------------------------------------------------"
echo "🔍 [Phase 2] Running API Vulnerability Audit..."
bash /sandbox/scripts/scan-api-vulnerabilities.sh

echo "--------------------------------------------------------"
echo "🤖 [Phase 3] Running AI Prompt Stress Test..."
bash /sandbox/scripts/simulate-ai-attacks.sh

echo "--------------------------------------------------------"
echo "✅ Sovereign Gauntlet Finished."
echo "Review logs/ for Nikto/SQLMap reports and check system logs for defense triggers."
