# 🛡️ Elysia OS - Universal PowerShell Utility Library
# Version 1.0 (Phase 17 Robust Infrastructure)

function Get-ElysiaFiles {
    <#
    .SYNOPSIS
        Robustly find files matching multiple patterns without positional parameter errors.
    .EXAMPLE
        Get-ElysiaFiles -Patterns "*.c", "*.rs" -Recurse
    #>
    param(
        [string[]]$Patterns = @("*"),
        [string]$Path = ".",
        [switch]$Recurse
    )

    $results = @()
    foreach ($pattern in $Patterns) {
        if ($Recurse) {
            $results += Get-ChildItem -Path $Path -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue
        } else {
            $results += Get-ChildItem -Path $Path -Filter $pattern -File -ErrorAction SilentlyContinue
        }
    }
    return $results | Select-Object -Unique
}

function Invoke-ElysiaCommand {
    <#
    .SYNOPSIS
        Safely execute a command with optional CMD fallback.
    #>
    param(
        [string]$Command,
        [string]$Arguments = ""
    )
    
    try {
        Write-Host "🚀 Executing: $Command $Arguments" -ForegroundColor Gray
        Start-Process $Command -ArgumentList $Arguments -Wait -NoNewWindow
    } catch {
        Write-Warning "⚠️ Native execution failed. Attempting CMD fallback..."
        cmd /c "$Command $Arguments"
    }
}

function Resolve-ElysiaPath {
    <#
    .SYNOPSIS
        Normalizes paths for the current OS.
    #>
    param([string]$Path)
    return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../$Path"))
}

# Export functions
Export-ModuleMember -Function Get-ElysiaFiles, Invoke-ElysiaCommand, Resolve-ElysiaPath
