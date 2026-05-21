[CmdletBinding()]
param(
  [string]$BucketName = "elysiaai-backup",
  [string]$ProjectRoot = ".",
  [string]$Profile = "elysiaai",
  [ValidateSet("daily", "weekly", "incident")]
  [string]$Prefix = "daily",
  [string]$KmsKeyId = $env:ELYSIAAI_BACKUP_KMS_KEY_ID,
  [string]$PassphraseEnvVar = "ELYSIAAI_BACKUP_PASSPHRASE",
  [switch]$AllowUnencryptedArchive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-CommandName {
  param(
    [string]$Name,
    [string[]]$FallbackPaths = @()
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Name
  }

  foreach ($path in $FallbackPaths) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "Required command not found: $Name"
}

function Get-RelativeBackupPath {
  param(
    [string]$RootPath,
    [string]$FullPath
  )

  $relative = $FullPath.Substring($RootPath.Length)
  return $relative.TrimStart([char[]]@("\", "/"))
}

function Test-ExcludedBackupPath {
  param(
    [System.IO.FileInfo]$File,
    [string]$RootPath
  )

  $excludedDirectories = @(
    ".git",
    ".next",
    ".turbo",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "venv"
  )

  $excludedFileNames = @(
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    ".envrc",
    ".netrc",
    ".npmrc",
    ".pypirc",
    "id_ed25519",
    "id_rsa"
  )

  $excludedExtensions = @(
    ".key",
    ".p12",
    ".pem",
    ".pfx"
  )

  $relative = Get-RelativeBackupPath -RootPath $RootPath -FullPath $File.FullName
  $parts = $relative -split "[\\/]"

  foreach ($part in $parts) {
    if ($excludedDirectories -contains $part) {
      return $true
    }
  }

  if ($excludedFileNames -contains $File.Name) {
    return $true
  }

  if ($excludedExtensions -contains $File.Extension) {
    return $true
  }

  if ($File.Name -like "*.secret.*" -or $File.Name -like "secrets.*") {
    return $true
  }

  return $false
}

function Copy-BackupFiles {
  param(
    [System.IO.FileInfo[]]$Files,
    [string]$RootPath,
    [string]$StagePath
  )

  foreach ($file in $Files) {
    $relative = Get-RelativeBackupPath -RootPath $RootPath -FullPath $file.FullName
    $target = Join-Path $StagePath $relative
    $targetDirectory = Split-Path -Parent $target

    if (-not (Test-Path -LiteralPath $targetDirectory)) {
      New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    }

    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
  }
}

if ([string]::IsNullOrWhiteSpace($BucketName)) {
  throw "BucketName is required."
}

$awsCommand = Resolve-CommandName -Name "aws"

$resolvedRoot = Resolve-Path -LiteralPath $ProjectRoot
$rootPath = $resolvedRoot.ProviderPath.TrimEnd([char[]]@("\", "/"))

$passphrase = [Environment]::GetEnvironmentVariable($PassphraseEnvVar)
$useClientEncryption = -not [string]::IsNullOrWhiteSpace($passphrase)

if ($useClientEncryption) {
  $openSslCommand = Resolve-CommandName -Name "openssl" -FallbackPaths @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files\Git\mingw64\bin\openssl.exe",
    "C:\Program Files\Git\bin\openssl.exe"
  )
} elseif (-not $AllowUnencryptedArchive) {
  throw "Set $PassphraseEnvVar for client-side encryption, or pass -AllowUnencryptedArchive for a server-side-encryption-only upload."
}

$date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupBaseName = "elysiaai-backup-$date"
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) $backupBaseName
$stagePath = Join-Path $tempDirectory "stage"
$plainArchive = Join-Path $tempDirectory "$backupBaseName.zip"
$encryptedArchive = Join-Path $tempDirectory "$backupBaseName.zip.enc"

New-Item -ItemType Directory -Path $stagePath -Force | Out-Null

try {
  Write-Host "Collecting ElysiaAI backup files from $rootPath"

  $files = @(Get-ChildItem -LiteralPath $rootPath -Recurse -File -Force |
    Where-Object { -not (Test-ExcludedBackupPath -File $_ -RootPath $rootPath) })

  if ($files.Count -eq 0) {
    throw "No files matched the backup include set."
  }

  Copy-BackupFiles -Files $files -RootPath $rootPath -StagePath $stagePath

  Write-Host "Creating archive: $backupBaseName.zip"
  Compress-Archive -Path (Join-Path $stagePath "*") -DestinationPath $plainArchive -Force

  $uploadPath = $plainArchive
  $uploadName = "$backupBaseName.zip"

  if ($useClientEncryption) {
    Write-Host "Encrypting archive with OpenSSL AES-256-CBC and PBKDF2."
    & $openSslCommand enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in $plainArchive -out $encryptedArchive -pass "env:$PassphraseEnvVar"

    if ($LASTEXITCODE -ne 0) {
      throw "OpenSSL encryption failed."
    }

    Remove-Item -LiteralPath $plainArchive -Force
    $uploadPath = $encryptedArchive
    $uploadName = "$backupBaseName.zip.enc"
  } else {
    Write-Warning "Uploading an unencrypted local archive. S3 server-side encryption will still be requested."
  }

  $destination = "s3://$BucketName/$Prefix/$uploadName"
  $awsArgs = @("s3", "cp", $uploadPath, $destination, "--profile", $Profile)

  if ([string]::IsNullOrWhiteSpace($KmsKeyId)) {
    $awsArgs += @("--sse", "AES256")
  } else {
    $awsArgs += @("--sse", "aws:kms", "--sse-kms-key-id", $KmsKeyId)
  }

  Write-Host "Uploading backup to $destination"
  & $awsCommand @awsArgs

  if ($LASTEXITCODE -ne 0) {
    throw "aws s3 cp failed."
  }

  Write-Host "Backup uploaded: $destination"
} finally {
  if (Test-Path -LiteralPath $tempDirectory) {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
  }
}
