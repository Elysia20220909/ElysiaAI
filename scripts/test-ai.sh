#!/bin/bash
# Test AI endpoint with English prompt
# Works on Linux, macOS, and WSL

URL="${1:-http://localhost:3000/ai}"

echo "Testing AI endpoint: $URL"
echo "Sending English prompt..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, please respond in English. Tell me a short friendly greeting."
      }
    ]
  }')

HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status: $HTTP_STATUS"
echo "--- Response body ---"
echo "$HTTP_BODY"
echo "--- End response ---"
