#!/bin/bash
# ==================== ElysiaAI API Vulnerability Scanner ====================
# This script runs within the security-sandbox to audit the ElysiaJS server.

TARGET_HOST="app"
TARGET_PORT="3000"
TARGET_URL="http://${TARGET_HOST}:${TARGET_PORT}"

echo "🔍 Starting API Vulnerability Audit on Sovereign Layer..."
echo "Target: ${TARGET_URL}"
echo "--------------------------------------------------------"

# 1. Nikto Web Server Scan
echo "[1/3] Running Nikto Web Server Scan..."
nikto -h "${TARGET_URL}" -Tuning 123457890 -Display 1234 -o /sandbox/logs/nikto-out.txt
echo "Nikto scan completed. Results saved to logs/nikto-out.txt"

echo "--------------------------------------------------------"

# 2. SQLMap SQL Injection Test
# We target the /auth/token endpoint (as identified in verify-security.sh)
echo "[2/3] Running SQLMap Injection Test..."
sqlmap -u "${TARGET_URL}/auth/token" --data='{"username":"admin","password":"password"}' \
  --batch --random-agent --level=1 --risk=1 --dbms=sqlite \
  --output-dir=/sandbox/logs/sqlmap
echo "SQLMap scan completed."

echo "--------------------------------------------------------"

# 3. SSTImap Template Injection Test
echo "[3/3] Running SSTImap Template Injection Test..."
sstimap -u "${TARGET_URL}" --batch --output /sandbox/logs/sstimap-out.txt
echo "SSTImap scan completed."

echo "--------------------------------------------------------"
echo "✅ API Vulnerability Audit Finished."
