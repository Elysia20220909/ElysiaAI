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
    apt-get install -y clang lld nasm make mtools dosfstools qemu-utils xorriso && \
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

Write-Host "[*] Compiling Kernel & Forging VMDK Drive..." -ForegroundColor Cyan
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
Write-Host "Output Files:" -ForegroundColor Cyan
Write-Host "  - elysia_os.vmx  (VMware Config - DOUBLE CLICK THIS!)" -ForegroundColor Magenta
Write-Host "  - elysia_os.vmdk (VMware Virtual Disk)" -ForegroundColor Green
Write-Host "  - elysia_os.iso  (CD-ROM / ISO Image)" -ForegroundColor Green
Write-Host "  - elysia_os.img  (USB / Raw Disk Image)" -ForegroundColor Green
Write-Host ""
Write-Host "How to Launch in VMware:" -ForegroundColor Yellow
Write-Host " 1. Open the 'kernel' folder in Windows Explorer."
Write-Host " 2. Double-click on 'elysia_os.vmx'." -ForegroundColor Cyan
Write-Host " 3. VMware will open and automatically configure everything."
Write-Host " 4. Click 'Power On' and witness sovereignty." -ForegroundColor Magenta
Write-Host ""
