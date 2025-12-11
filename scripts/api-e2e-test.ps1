# ElysiaAI API/チャット自動テストスクリプト
# /health, /metrics, /chat などのエンドポイントを自動テスト

Write-Host "[API Test] /health"
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing

Write-Host "[API Test] /metrics"
Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing

Write-Host "[API Test] /chat"
$body = '{"messages":[{"role":"user","content":"こんにちは"}]}'
Invoke-WebRequest -Uri "http://localhost:3000/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
