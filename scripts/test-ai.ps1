param(
    [string]$Url = "http://localhost:3000/ai"
)

Write-Host "🧪 Testing AI endpoint: $Url"

$body = @{ messages = @(@{ role = "user"; content = "Hello, please respond in English. Tell me a short friendly greeting." }) } | ConvertTo-Json -Depth 5

try {
    $response = Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host ("Status: {0}" -f $response.StatusCode)
    Write-Host "--- Response body ---"
    $response.Content | Write-Output
    Write-Host "--- End response ---"
} catch {
    if ($_.Exception.Response) {
        $res = $_.Exception.Response
        $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
        $content = $reader.ReadToEnd()
        Write-Host ("Status: {0}" -f [int]$res.StatusCode)
        Write-Host "--- Response body ---"
        Write-Output $content
        Write-Host "--- End response ---"
    } else {
        Write-Error $_
    }
}