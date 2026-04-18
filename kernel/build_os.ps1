Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        ELYSIOS SOVEREIGN KERNEL BUILD ENGINE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] Verifying Docker Engine Integration..." -ForegroundColor Blue
docker --version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Docker Engine is not running or not installed." -ForegroundColor Red
    Write-Host "[!] Elysia OS uses Docker to provide a perfectly sterile, predictable build environment." -ForegroundColor Yellow
    Write-Host "[!] Please install Docker Desktop for Windows and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "[*] Writing Secure Build Container Blueprint (Dockerfile)..." -ForegroundColor Blue
$dockerfile = @"
FROM rust:slim
RUN apt-get update && \
    apt-get install -y clang lld nasm make mtools dosfstools xorriso && \
    rm -rf /var/lib/apt/lists/*
RUN rustup target add x86_64-pc-windows-gnullvm
WORKDIR /os
CMD ["make"]
"@
$dockerfile | Out-File -FilePath "Dockerfile" -Encoding UTF8

Write-Host "[*] Instantiating Build Environment (This may take a moment on first run)..." -ForegroundColor Yellow
docker build -t elysia-kernel-builder .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Build Environment instantiation failed." -ForegroundColor Red
    exit 1
}

Write-Host "[*] Compiling Kernel & Weaving ISO Hologram..." -ForegroundColor Cyan
docker run --rm -v "${PWD}:/os" elysia-kernel-builder
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Kernel compilation failed! The build process encountered an error." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] ELYSIA OS COMPILED AND MANIFESTED!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output File: elysia_os.iso" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run your Sovereign OS on VirtualBox:" -ForegroundColor Yellow
Write-Host " 1. Open VirtualBox and click 'New'."
Write-Host " 2. Name: Elysia OS | Type: Other | Version: Other/Unknown (64-bit)"
Write-Host " 3. Memory: 2048 MB or higher."
Write-Host " 4. Hard Disk: Do not add a virtual hard disk (or attach elysia_os.img if you wish)."
Write-Host " 5. Go to Settings -> System -> Motherboard -> CHECK 'Enable EFI (special OSes only)'"
Write-Host " 6. Go to Settings -> Storage -> Empty optical drive -> Choose 'elysia_os.iso'"
Write-Host " 7. Start the Virtual Machine and witness sovereignty." -ForegroundColor Magenta
Write-Host ""
