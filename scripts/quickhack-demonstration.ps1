# QUICKHACK DEMONSTRATION (Phase 115)
# EXPERIENCE THE SOVEREIGN CYBERDECK IN ACTION

$ErrorActionPreference = "Stop"

# Set console to support ANSI colors if possible
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- INITIALIZING NEURAL LINK ---" -ForegroundColor Yellow

# Run the Physical Projection Core (Cyberpunk Overhaul)
python src/forge/physical_projection_core.py

Write-Host ""
Write-Host "--- DISCONNECTING FROM NET ---" -ForegroundColor Red
