Add-Type -AssemblyName PresentationFramework

$webhookUrl = 'https://discord.com/api/webhooks/1496525926446530731/mRnNBFHwzXwXhi-KLMulkmO3wtXLwGFm6TlByQiIoKCz9MDjNqECX8Qhcq1XslO076_j'

# Read manifesto from file forcing UTF8
$manifesto = Get-Content -Path "c:\Users\hosih\GitHub\ElysiaAI\scratch\manifesto.txt" -Encoding UTF8 -Raw

$body = @{ content = $manifesto; username = 'Elysia Sentinel L50' } | ConvertTo-Json -Depth 2
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
try {
    $req = [System.Net.WebRequest]::Create($webhookUrl)
    $req.Method = 'POST'
    $req.ContentType = 'application/json'
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $res = $req.GetResponse()
    $res.Close()
    Write-Host "Webhook sent."
} catch {
    Write-Host "Webhook fail"
}

try {
    $xaml = Get-Content -Path "c:\Users\hosih\GitHub\ElysiaAI\scratch\ghost_ui.xaml" -Encoding UTF8 -Raw
    $reader = (New-Object System.Xml.XmlNodeReader ([xml]$xaml))
    $window = [System.Windows.Markup.XamlReader]::Load($reader)

    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromSeconds(10)
    $timer.Add_Tick({ $window.Close() })
    $timer.Start()

    Write-Host "Showing Ghost UI..."
    $window.ShowDialog() | Out-Null
    Write-Host "Ghost UI sublimated."
} catch {
    Write-Host "Failed to manifest Ghost UI"
}
