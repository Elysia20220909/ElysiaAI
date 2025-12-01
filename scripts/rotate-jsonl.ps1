Param(
    [string]$DataDir = "data",
    [int]$MaxSizeMB = 50
)

function Get-SizeMB($path) {
    if (!(Test-Path $path)) { return 0 }
    $bytes = (Get-Item $path).Length
    return [math]::Round($bytes / 1MB)
}

if (!(Test-Path $DataDir)) {
    Write-Output "Data directory not found: $DataDir"
    exit 0
}

$files = Get-ChildItem -Path $DataDir -Filter "*.jsonl" -File
foreach ($f in $files) {
    $size = Get-SizeMB $f.FullName
    if ($size -ge $MaxSizeMB) {
        $ts = Get-Date -Format "yyyyMMddHHmmss"
        $archive = "$($f.FullName).$ts"
        Write-Output "Rotating $($f.Name) ($size MB) -> $archive"
        Move-Item -Force -Path $f.FullName -Destination $archive
        New-Item -ItemType File -Path $f.FullName | Out-Null
    }
}

Write-Output "Rotation complete"
