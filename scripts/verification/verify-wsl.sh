#!/bin/bash
# WSL-based Service Verification Script
# Usage: wsl bash verify-wsl.sh

set -e

echo "========================================"
echo "   WSL SERVICE VERIFICATION"
echo "========================================"
echo ""

total=0
ok=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Redis Check
echo -n "[1/4] Redis (6379)... "
if timeout 3 bash -c "echo > /dev/tcp/localhost/6379" 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC} Redis is running"
    ((ok++))
else
    echo -e "${RED}[FAIL]${NC} Redis is not responding"
fi
((total++))

# FastAPI Health Check
echo -n "[2/4] FastAPI (8000)... "
response=$(curl -s -w "\n%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    quotes=$(echo "$body" | grep -o '"quotes_count":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo -e "${GREEN}[OK]${NC} FastAPI is running (Quotes: $quotes)"
    ((ok++))
else
    echo -e "${RED}[FAIL]${NC} FastAPI returned status $http_code"
fi
((total++))

# Ollama Check
echo -n "[3/4] Ollama (11434)... "
response=$(curl -s -w "\n%{http_code}" http://localhost:11434/api/tags 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    models=$(echo "$body" | grep -o '"models":\[' | wc -l || echo "0")
    echo -e "${GREEN}[OK]${NC} Ollama is running (Models available)"
    ((ok++))
else
    echo -e "${RED}[FAIL]${NC} Ollama returned status $http_code"
fi
((total++))

# RAG Search Test
echo -n "[4/4] RAG Search... "
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/rag \
    -H "Content-Type: application/json" \
    -d '{"text":"test"}' 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    results=$(echo "$body" | grep -o '"quotes":\[' | wc -l || echo "0")
    echo -e "${GREEN}[OK]${NC} RAG search is working"
    ((ok++))
else
    echo -e "${RED}[FAIL]${NC} RAG search returned status $http_code"
fi
((total++))

echo ""
echo "========================================"
echo -e "   RESULT: ${CYAN}$ok/$total${NC} services OK"
echo "========================================"
echo ""

if [ $ok -eq $total ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All services are operational!"
    exit 0
else
    echo -e "${YELLOW}[WARNING]${NC} Some services are not working"
    exit 1
fi
