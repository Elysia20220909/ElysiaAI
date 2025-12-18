# ElysiaAI Swift Build Script for Windows
# Requires: Visual Studio 2022 + Swift 6.2.1 toolchain
# Usage: ./build-windows.ps1 -Config Debug|Release|Full -Verbose

param(
    [ValidateSet("Debug", "Release", "Full")]
    [string]$Config = "Debug",
    [switch]$Verbose,
    [switch]$Clean,
    [switch]$Test,
    [string]$ArchiveDir = "$PSScriptRoot\..\build-artifacts"
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot

# Color output
function Write-Log {
    param([string]$Message, [ValidateSet("Info", "Success", "Warning", "Error")]$Level = "Info")
    $colors = @{
        "Info"    = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error"   = "Red"
    }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

# Check prerequisites
function Check-Prerequisites {
    Write-Log "Checking prerequisites..." "Info"
    
    $checks = @(
        @{ Name = "Swift"; Command = "swift --version" },
        @{ Name = "Git"; Command = "git --version" }
    )
    
    foreach ($check in $checks) {
        try {
            $result = & $check.Command 2>&1
            Write-Log "✓ $($check.Name) found: $($result | Select-Object -First 1)" "Success"
        }
        catch {
            Write-Log "✗ $($check.Name) not found. Install Visual Studio 2022 with Swift toolchain." "Error"
            exit 1
        }
    }
    
    # Check if running in Developer Command Prompt context
    if (-not $env:VCINSTALLDIR) {
        Write-Log "Warning: Developer Command Prompt environment not detected." "Warning"
        Write-Log "For best results, run this script from Developer Command Prompt." "Warning"
    }
}

# Clean build artifacts
function Clean-Artifacts {
    Write-Log "Cleaning build artifacts..." "Info"
    
    $cleanDirs = @(
        "$ProjectRoot\.build",
        "$ProjectRoot\build-artifacts",
        "$ProjectRoot\.swiftpm"
    )
    
    foreach ($dir in $cleanDirs) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force
            Write-Log "✓ Removed $dir" "Success"
        }
    }
}

# Debug build
function Build-Debug {
    Write-Log "Starting Debug build..." "Info"
    
    Push-Location $ProjectRoot
    try {
        $args = @("build", "--configuration", "debug")
        if ($Verbose) { $args += "--verbose" }
        
        & swift @args
        if ($LASTEXITCODE -ne 0) {
            throw "Debug build failed with exit code $LASTEXITCODE"
        }
        Write-Log "✓ Debug build completed successfully" "Success"
    }
    finally {
        Pop-Location
    }
}

# Release build
function Build-Release {
    Write-Log "Starting Release build..." "Info"
    
    Push-Location $ProjectRoot
    try {
        $args = @("build", "--configuration", "release")
        if ($Verbose) { $args += "--verbose" }
        
        & swift @args
        if ($LASTEXITCODE -ne 0) {
            throw "Release build failed with exit code $LASTEXITCODE"
        }
        Write-Log "✓ Release build completed successfully" "Success"
    }
    finally {
        Pop-Location
    }
}

# Full build with tests and artifacts
function Build-Full {
    Write-Log "Starting Full build pipeline..." "Info"
    
    # Clean
    Clean-Artifacts
    
    # Build Debug
    Build-Debug
    
    # Build Release
    Build-Release
    
    # Run tests if flag set
    if ($Test) {
        Run-Tests
    }
    
    # Create archives
    Create-Archives
}

# Run unit tests
function Run-Tests {
    Write-Log "Running unit tests..." "Info"
    
    Push-Location $ProjectRoot
    try {
        & swift test --configuration debug
        if ($LASTEXITCODE -ne 0) {
            throw "Tests failed with exit code $LASTEXITCODE"
        }
        Write-Log "✓ All tests passed" "Success"
    }
    catch {
        Write-Log "✗ Test execution failed: $_" "Error"
        if (-not $Test) {
            Write-Log "Use -Test flag to include tests in build" "Info"
        }
    }
    finally {
        Pop-Location
    }
}

# Create distributable archives
function Create-Archives {
    Write-Log "Creating distribution archives..." "Info"
    
    if (-not (Test-Path $ArchiveDir)) {
        New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
    }
    
    # Archive debug build
    $debugBuild = "$ProjectRoot\.build\debug"
    if (Test-Path $debugBuild) {
        $zipFile = "$ArchiveDir\ElysiaAI-Debug-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
        & 7z a -r $zipFile $debugBuild
        Write-Log "✓ Created $zipFile" "Success"
    }
    
    # Archive release build
    $releaseBuild = "$ProjectRoot\.build\release"
    if (Test-Path $releaseBuild) {
        $zipFile = "$ArchiveDir\ElysiaAI-Release-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
        & 7z a -r $zipFile $releaseBuild
        Write-Log "✓ Created $zipFile" "Success"
    }
    
    Write-Log "Artifacts available in: $ArchiveDir" "Info"
}

# Print environment info
function Print-Env {
    Write-Log "Environment Information:" "Info"
    Write-Log "  Swift Version: $(swift --version | Select-Object -First 1)"
    Write-Log "  OS: $([System.Environment]::OSVersion)"
    Write-Log "  Project Root: $ProjectRoot"
    Write-Log "  Configuration: $Config"
    Write-Log "  Verbose: $Verbose"
    Write-Log "  Clean: $Clean"
    Write-Log "  Test: $Test"
}

# Main execution
try {
    Print-Env
    Check-Prerequisites
    
    if ($Clean) {
        Clean-Artifacts
    }
    
    switch ($Config) {
        "Debug" {
            Build-Debug
        }
        "Release" {
            Build-Release
        }
        "Full" {
            Build-Full
        }
    }
    
    Write-Log "Build completed successfully!" "Success"
}
catch {
    Write-Log "Build failed: $_" "Error"
    exit 1
}
