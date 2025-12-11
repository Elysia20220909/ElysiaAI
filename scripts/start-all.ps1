# ElysiaAI サービス一括起動スクリプト
# Redis, Ollama, DB, サーバを順次起動

Write-Host "[1/4] Redisサーバ起動..."
Start-Process -NoNewWindow -FilePath "redis-server" -ArgumentList "--service-start" -WindowStyle Hidden
Start-Sleep -Seconds 2

Write-Host "[2/4] Ollamaサーバ起動..."
Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 2

Write-Host "[3/4] DB (PostgreSQL/Prisma) マイグレーション..."
bun prisma generate
bunx prisma migrate dev
Start-Sleep -Seconds 2

Write-Host "[4/4] ElysiaAIサーバ起動..."
bun src/index.ts
