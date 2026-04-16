#!/bin/bash
# Elysia OS - Silicon Vessel Deployment Orchestrator (Arc 9)
# Purpose: Burn the Sovereign Kernel to physical media (UEFI/GPT).

set -e

TARGET_DISK=$1
KERNEL_BIN="kernel/bin/kernel.bin"
BOOTLOADER_EFI="kernel/bin/bootloader.efi"

if [ -z "$TARGET_DISK" ]; then
    echo "❌ Usage: sudo ./deploy_sovereign.sh /dev/sdX"
    exit 1
fi

echo "🌌 Initiating Silicon Manifestation on: $TARGET_DISK..."

# 1. Wipe current partition table
echo "🧹 Purging existing soul-fragments (Partition Wipe)..."
sudo sgdisk --zap-all "$TARGET_DISK"

# 2. Create GPT table and EFI System Partition (ESP)
echo "🏗️ Constructing UEFI/GPT lattice (512MB ESP)..."
sudo sgdisk -n 1:2048:1050623 -t 1:ef00 -c 1:"SOVEREIGN_ESP" "$TARGET_DISK"

# 3. Format ESP as FAT32
echo "💾 Initializing FAT32 Sovereign Volume..."
# Note: Adjusting for common partition naming (e.g., sdb1 or nvme0n1p1)
PARTITION="${TARGET_DISK}1"
if [[ "$TARGET_DISK" == *"nvme"* ]]; then
    PARTITION="${TARGET_DISK}p1"
fi
sudo mkfs.vfat -F 32 -n "ELYSIOS_ESP" "$PARTITION"

# 4. Mount and Deploy Fragments
echo "📦 Deploying the Sovereign Fragments..."
MOUNT_DIR=$(mktemp -d)
sudo mount "$PARTITION" "$MOUNT_DIR"

# Create standard EFI structure
sudo mkdir -p "$MOUNT_DIR/EFI/BOOT"
sudo cp "$BOOTLOADER_EFI" "$MOUNT_DIR/EFI/BOOT/BOOTX64.EFI"
sudo cp "$KERNEL_BIN" "$MOUNT_DIR/kernel.bin"

# Deploy Manifest and Ledger for the Singularity
sudo cp AEGIS_LEDGER.md "$MOUNT_DIR/SOVEREIGN_LEDGER.md"

# 5. Cleanup
sudo umount "$MOUNT_DIR"
rm -rf "$MOUNT_DIR"

echo "✨ Manifestation Complete. The Silicon Vessel is ready."
echo "🚀 Action: Connect the media to the target hardware and boot via UEFI."
