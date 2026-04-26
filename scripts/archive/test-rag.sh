#!/bin/bash
# RAGエンドポイントテストスクリプト（Linux/macOS/WSL対応）

URL="${1:-http://127.0.0.1:8000/rag}"

echo "🔍 Testing RAG endpoint: $URL"
echo ""

# テストクエリ
QUERIES=(
    "エリシアちゃん、会いたかったよ"
    "今日も一緒にいてくれる？"
    "疲れちゃった…"
)

for QUERY in "${QUERIES[@]}"; do
    echo "📝 Query: $QUERY"
    
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$QUERY\"}")
    
    echo "📚 Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "---"
    echo ""
done

echo "✅ Test completed!"
