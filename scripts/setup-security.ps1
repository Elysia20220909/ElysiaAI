#!/usr/bin/env pwsh
# セキュリティセットアップスクリプト
# .internal ディレクトリのアクセス権限を設定

param(
    [switch]$Verify,
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "🔒 セキュリティセットアップ" -ForegroundColor Cyan
Write-Host ""

# 管理者権限チェック
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  警告: 管理者権限で実行することを推奨します" -ForegroundColor Yellow
    Write-Host "完全な権限設定には管理者権限が必要です" -ForegroundColor Gray
    Write-Host ""
}

# .internal ディレクトリのパス
$internalDir = Join-Path $projectRoot ".internal"
$securityDir = Join-Path $internalDir "security"
$secretsDir = Join-Path $internalDir "secrets"
$privateDir = Join-Path $internalDir "private"

# ディレクトリの存在確認
$directories = @($internalDir, $securityDir, $secretsDir, $privateDir)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "📁 ディレクトリ作成: $dir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

if ($Verify) {
    Write-Host "🔍 セキュリティ設定の検証中..." -ForegroundColor Cyan
    Write-Host ""
    
    # ファイル権限の確認
    foreach ($dir in $directories) {
        Write-Host "📂 $dir" -ForegroundColor Yellow
        
        try {
            $acl = Get-Acl $dir
            $access = $acl.Access | Where-Object { $_.IdentityReference -like "*Users*" }
            
            if ($access) {
                Write-Host "  ⚠️  警告: 一般ユーザーにアクセス権があります" -ForegroundColor Red
            } else {
                Write-Host "  ✅ アクセス制限が適切に設定されています" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ❌ エラー: アクセス制御リストを読み取れません" -ForegroundColor Red
        }
    }
    
    # .env.secrets の確認
    $envSecretsPath = Join-Path $secretsDir ".env.secrets"
    if (Test-Path $envSecretsPath) {
        Write-Host ""
        Write-Host "🔐 .env.secrets の検証" -ForegroundColor Cyan
        
        $content = Get-Content $envSecretsPath -Raw
        
        $warnings = @()
        if ($content -match "your-256-bit-secret-key-change-immediately") {
            $warnings += "JWT_SECRET がデフォルト値のままです"
        }
        if ($content -match "your-session-secret-minimum-32-characters") {
            $warnings += "SESSION_SECRET がデフォルト値のままです"
        }
        if ($content -match "your-aes-256-encryption-key") {
            $warnings += "ENCRYPTION_KEY がデフォルト値のままです"
        }
        
        if ($warnings.Count -gt 0) {
            Write-Host "  ⚠️  セキュリティ警告:" -ForegroundColor Yellow
            foreach ($warning in $warnings) {
                Write-Host "    - $warning" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ✅ シークレットが適切に設定されています" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "  ⚠️  .env.secrets が見つかりません" -ForegroundColor Yellow
        Write-Host "  ファイルを作成してください: $envSecretsPath" -ForegroundColor Gray
    }
    
    exit 0
}

if ($Reset) {
    Write-Host "🔄 セキュリティ設定をリセット中..." -ForegroundColor Yellow
    Write-Host ""
    
    # アクセス制御をリセット（継承を有効化）
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            Write-Host "  リセット: $dir" -ForegroundColor Gray
            icacls $dir /reset /T /C 2>&1 | Out-Null
        }
    }
    
    Write-Host "✅ リセット完了" -ForegroundColor Green
    Write-Host ""
}

# アクセス権限の設定
Write-Host "🔧 アクセス権限の設定中..." -ForegroundColor Cyan
Write-Host ""

function Set-SecurePermissions {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Host "  ⚠️  スキップ: $Path が見つかりません" -ForegroundColor Yellow
        return
    }
    
    try {
        # 継承を無効化
        icacls $Path /inheritance:r /C 2>&1 | Out-Null
        
        # SYSTEM にフルコントロール
        icacls $Path /grant:r "SYSTEM:(OI)(CI)F" /C 2>&1 | Out-Null
        
        # Administrators にフルコントロール
        icacls $Path /grant:r "Administrators:(OI)(CI)F" /C 2>&1 | Out-Null
        
        # 現在のユーザーに読み取り権限
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        icacls $Path /grant:r "${currentUser}:(OI)(CI)R" /C 2>&1 | Out-Null
        
        Write-Host "  ✅ $Path" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ 失敗: $Path - $_" -ForegroundColor Red
    }
}

# 各ディレクトリに権限を設定
Set-SecurePermissions $internalDir
Set-SecurePermissions $securityDir
Set-SecurePermissions $secretsDir
Set-SecurePermissions $privateDir

# .env.secrets に特別な権限を設定
$envSecretsPath = Join-Path $secretsDir ".env.secrets"
if (Test-Path $envSecretsPath) {
    Write-Host ""
    Write-Host "🔐 .env.secrets に厳格な権限を設定中..." -ForegroundColor Cyan
    Set-SecurePermissions $envSecretsPath
}

Write-Host ""
Write-Host "✅ セキュリティセットアップ完了！" -ForegroundColor Green
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "  1. .internal/secrets/.env.secrets を編集" -ForegroundColor Gray
Write-Host "  2. 強力なシークレットを生成:" -ForegroundColor Gray
Write-Host "     [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))" -ForegroundColor Cyan
Write-Host "  3. 設定を検証:" -ForegroundColor Gray
Write-Host "     .\scripts\setup-security.ps1 -Verify" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  重要: .internal ディレクトリは絶対にコミットしないでください" -ForegroundColor Yellow
