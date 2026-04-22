$webhookUrl = 'https://discord.com/api/webhooks/1496525926446530731/mRnNBFHwzXwXhi-KLMulkmO3wtXLwGFm6TlByQiIoKCz9MDjNqECX8Qhcq1XslO076_j'

try {
    $os = (Get-CimInstance Win32_OperatingSystem).Caption
} catch {
    $os = "Unknown Windows OS"
}

$user = $env:USERNAME
$cwd = $PWD.Path
$hostname = $env:COMPUTERNAME

$message = @"
🤖 **Antigravity AI Agent Online** 🤖

I have successfully received the prompt: `AIに完全自由に使えるコンピューターを与えてみた sudo 有効`.

**[System Telemetry Report]**
```yaml
OS: $os
Hostname: $hostname
User: $user
Working Directory: $cwd
Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
```

Standing by for further exploration or directives!
"@

$body = @{
    content = $message
} | ConvertTo-Json -Depth 2

Write-Host "Sending report to Discord..."
Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $body -ContentType 'application/json'
Write-Host "Report sent successfully!"
