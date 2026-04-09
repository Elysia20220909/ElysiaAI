# 🧧 Elysia OS: Raspberry Pi 4 Deployment Guide

This guide details how to manifest the AbyssRTOS kernel on physical Raspberry Pi 4 hardware.

## 🛠️ Prerequisites
- Raspberry Pi 4 Model B
- MicroSD Card (min 4GB)
- USB to Serial Adapter (PL2303 / CP2102) for kernel debugging
- Ethernet Cable (for Aegis Network Link)

## 💾 SD Card Preparation

### 1. Partitioning (Windows)
Use `diskpart` or a GUI tool like Rufus/Etcher to create a **FAT32** partition. 
Elysia OS requires the boot partition to be FAT32 to be readable by the RPi firmware.

### 2. Required Firmware Files
Copy the following blobs from the [official RPi firmware repository](https://github.com/raspberrypi/firmware/tree/master/boot):
- `bootcode.bin`
- `start4.elf`
- `fixup4.dat`

### 3. Configuration (`config.txt`)
Create a `config.txt` in the root of the SD card:
```ini
# Elysia OS Kernel Config
arm_64bit=1
kernel=kernel8.img
enable_uart=1
uart_2ndstage=1
```

## 🧧 Deploying the Kernel

### 1. Build the Artifact
Run the following in your terminal:
```powershell
make -C usr/src/abyssrtos PLATFORM=rpi4
```

### 2. Flash the Image
Copy `usr/src/abyssrtos/kernel8.img` to the root of the SD card.

## 📡 Kernel Debugging
Connect your Serial adapter to the following pins:
- **TX**: GPIO 14 (Pin 8)
- **RX**: GPIO 15 (Pin 10)
- **GND**: Pin 6

Use `minicom` or `Putty` at **115200 baud**.

> [!WARNING]
> **Voltages**: Ensure your serial adapter is set to 3.3V. Using 5V will bridge the abyss permanently (fry your RPi).

## 🧬 Aegis Link Verification
Once booted, the kernel will probe the BCM GENET controller. 
Verify the following logs in your serial console:
```log
 [BOOT] Initializing Resonance Schedulers...
 [AEGIS] Probing GENET Controller at 0xFD580000...
 [AEGIS] LINK_UP: 1000Mbps / Full-Duplex
 [SYS] V_O_I_D Kernel v1.3 Manifested.
```
