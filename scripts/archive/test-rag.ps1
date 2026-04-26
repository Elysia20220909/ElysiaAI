param(
    [string]$Url = "http://127.0.0.1:8000/rag"
)

Write-Host "🔍 Testing RAG endpoint: $Url"

$queries = @(
    "エリシアちゃん、会いたかったよ",
    "今日も一緒にいてくれる？",
    "疲れちゃった…"
)

foreach ($q in $queries) {
    Write-Host "📝 Query: $q"
    $body = @{ text = $q } | ConvertTo-Json -Depth 3
    try {
        $res = Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
        Write-Host ("Status: {0}" -f $res.StatusCode)
        try {
            ($res.Content | ConvertFrom-Json) | ConvertTo-Json -Depth 6
        } catch { $res.Content }
        Write-Host "---"
    } catch {
        if ($_.Exception.Response) {
            $r = $_.Exception.Response
            $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
            $content = $reader.ReadToEnd()
            Write-Host ("Status: {0}" -f [int]$r.StatusCode)
            Write-Output $content
            Write-Host "---"
        } else {
            Write-Error $_
        }
    }
}

Write-Host "✅ Test completed!"