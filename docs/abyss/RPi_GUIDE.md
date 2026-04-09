# 🧧 AbyssRTOS Physical Manifestation Guide (RPi)

This document outlines the ritual for deploying the AbyssRTOS kernel to a physical Raspberry Pi.

## 🛠️ Required Artifacts
- **Hardware**: Raspberry Pi 4 Model B (Recommended) or RPi 3 B/B+.
- **Medium**: 8GB+ MicroSD Card.
- **Tools**: `dd` (Linux/WSL) or `Raspberry Pi Imager`.

## 📦 SD Card Preparation (The Altar)
The RPi bootloader expects a **FAT32** partition.

1.  **Partitioning**: Create a small FAT32 partition (e.g., 256MB) at the start of the SD card.
2.  **Firmware Extraction**: Download the latest [RPi Firmware](https://github.com/raspberrypi/firmware) and copy these files to the root of the SD card:
    - `bootcode.bin` (RPi 3 only)
    - `start4.elf` / `fixup4.dat` (RPi 4)
    - `start.elf` / `fixup.dat` (RPi 3)

## 🧬 Kernel Transmutation
Once you've compiled AbyssRTOS using the OS Makefile (`make -C usr/src/abyssrtos PLATFORM=rpi4`), follow these steps:

1.  **The Kernel Image**: Copy the resulting `kernel8.img` to the SD card root.
2.  **Configuration**: Create a `config.txt` file on the SD card with the following resonance parameters:
    ```ini
    # --- AbyssRTOS Resonance Config ---
    arm_64bit=1
    kernel=kernel8.img
    uart_2ndstage=1
    enable_uart=1
    ```

## 🚀 Execution (The Quickening)
1.  Insert the SD card into the RPi.
2.  Connect a **USB-to-Serial (UART)** cable:
    - RPi TX (GPIO 14) -> Cable RX
    - RPi RX (GPIO 15) -> Cable TX
    - RPi GND -> Cable GND
3.  Open a terminal (115200 baud) and power on the RPi.
4.  Watch as the **V_O_I_D Kernel** manifests in physical reality.

---
> [!WARNING]
> **Ethernet Stability**: The Aegis Ethernet driver is currently in 'Stub Phase'. Physical link-up will show in logs, but full TCP/IP routing requires further manifestation of the networking stack.
