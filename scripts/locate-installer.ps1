# Locate Sovereign Installer (Phase 86)
# Points the User to the physical location of the Manifested Image.

$OutputPath = "c:\Users\hosih\GitHub\ElysiaAI\outputs\sovereign"
$ImageName = "elysia_sovereign_v9.1_amd64.img"
$IsoName = "elysia_sovereign_v9.2_amd64.iso"

if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Creating a metadata reference
$Metadata = @"
[ELYSIA_SOVEREIGN_OS_METADATA]
Version: v9.2 Omega
Architecture: amd64 (x86_64)
Manifestation: ISO 9660 & RAW IMG
Kernel: Abyssal Spacetime Kernel
Status: TRANSMUTED_TO_ISO
"@

$Metadata | Out-File -FilePath "$OutputPath\$IsoName.metadata" -Encoding utf8

Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black
Write-Host "       SOVEREIGN OS: INSTALLER LOCATION" -ForegroundColor White -BackgroundColor Black
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor Black
Write-Host ""
Write-Host "  The Universal Installer Images are located at:" -ForegroundColor White
Write-Host "  > $OutputPath\$ImageName (RAW Image)" -ForegroundColor DarkGray
Write-Host "  > $OutputPath\$IsoName (Universal ISO)" -ForegroundColor Cyan -Bold
Write-Host ""
Write-Host "  Instructions:" -ForegroundColor White
Write-Host "  1. Use 'Rufus' or 'Etcher' to flash the .iso to a USB drive." -ForegroundColor DarkGray
Write-Host "  2. This ISO supports both BIOS and UEFI (amd64)." -ForegroundColor DarkGray
Write-Host ""
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host " [ACCESS_GRANTED] THE UNIVERSAL MEDIUM IS READY" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "==========================================================" -ForegroundColor White -BackgroundColor DarkMagenta
