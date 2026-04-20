#!/bin/bash
# ELYSIA IMAGE FORGE LOGIC
# The sacred commands to manifest an OS image from the Void.

IMAGE_NAME="elysia_sovereign_v8.8.img"
IMAGE_SIZE="4G" # Testing size

echo "[FORGE] Creating raw void file..."
truncate -s $IMAGE_SIZE $IMAGE_NAME

echo "[FORGE] Partitioning the Void (GPT)..."
parted -s $IMAGE_NAME mklabel gpt
parted -s $IMAGE_NAME mkpart ESP fat32 1MiB 512MiB
parted -s $IMAGE_NAME set 1 esp on
parted -s $IMAGE_NAME mkpart ROOT ext4 512MiB 100%

echo "[FORGE] Partitioning SUCCESS."
echo "[FORGE] Next steps (require root/loop): Formatting and Rootfs injection."
echo "[FORGE] Sovereign Image $IMAGE_NAME is ready for the 'Soul Injection' phase."
