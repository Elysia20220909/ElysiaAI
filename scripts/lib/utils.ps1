# 🛡️ Elysia OS - Universal PowerShell Utility Library
# Version 1.0 (Phase 17 Robust Infrastructure)

function Get-ElysiaFiles {
    <#
    .SYNOPSIS
        Robustly find files matching multiple patterns without positional parameter errors.
    #>
    param(
        [Parameter(Mandatory=$false)]
        [string[]]$Patterns = @("*"),
        [Parameter(Mandatory=$false)]
        [string]$Path = ".",
        [switch]$Recurse
    )

    $results = @()
    foreach ($pattern in $Patterns) {
        $searchPath = Resolve-Path $Path -ErrorAction SilentlyContinue
        if ($null -eq $searchPath) { continue }
        
        if ($Recurse) {
            $results += Get-ChildItem -Path $searchPath -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue
        } else {
            $results += Get-ChildItem -Path $searchPath -Filter $pattern -File -ErrorAction SilentlyContinue
        }
    }
    return $results | Select-Object -Unique
}

function Invoke-RobustCommand {
    <#
    .SYNOPSIS
        Executes a command with robust error checking and parameter validation.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command,
        [Parameter(Mandatory=$false)]
        [string[]]$Arguments = @(),
        [Parameter(Mandatory=$false)]
        [string]$WorkingDir = "."
    )
    
    $fullCmd = "$Command $($Arguments -join ' ')"
    Write-Host "🛡️ [ROBUST] Executing: $fullCmd" -ForegroundColor Cyan
    
    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $Command
        $pinfo.Arguments = $Arguments -join " "
        $pinfo.WorkingDirectory = (Resolve-Path $WorkingDir).Path
        $pinfo.UseShellExecute = $false
        $pinfo.RedirectStandardOutput = $true
        $pinfo.RedirectStandardError = $true
        
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo = $pinfo
        $p.Start() | Out-Null
        $p.WaitForExit()
        
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        
        if ($p.ExitCode -ne 0) {
            Write-Error "❌ Command failed with exit code $($p.ExitCode).`nSTDERR: $stderr"
        } else {
            Write-Host "✅ Success." -ForegroundColor Green
            return $stdout
        }
    } catch {
        Write-Warning "⚠️ Native execution failed: $($_.Exception.Message). Falling back to shell execution..."
        Invoke-Expression $fullCmd
    }
}

function Test-ElysiaEnvironment {
    <#
    .SYNOPSIS
        Validates the current environment for Elysia Phase 17 operations.
    #>
    $requirements = @("gcc", "cargo", "python")
    $status = @{}
    
    foreach ($req in $requirements) {
        $where = Get-Command $req -ErrorAction SilentlyContinue
        if ($where) {
            $status[$req] = "OK ($($where.Source))"
        } else {
            $status[$req] = "MISSING"
        }
    }
    
    Write-Host "🌐 --- Elysia Environment Status ---" -ForegroundColor Magenta
    $status.GetEnumerator() | ForEach-Object {
        $color = if ($_.Value -match "OK") { "Green" } else { "Red" }
        Write-Host "$($_.Key): $($_.Value)" -ForegroundColor $color
    }
}

# Export functions
Export-ModuleMember -Function Get-ElysiaFiles, Invoke-RobustCommand, Test-ElysiaEnvironment

