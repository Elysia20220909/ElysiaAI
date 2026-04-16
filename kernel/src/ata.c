#include <stdint.h>

void outb(uint16_t port, uint8_t val);
void outw(uint16_t port, uint16_t val);
uint8_t inb(uint16_t port);
uint16_t inw(uint16_t port);

#define ATA_PRIMARY_DATA         0x1F0
#define ATA_PRIMARY_ERR          0x1F1
#define ATA_PRIMARY_SECCOUNT     0x1F2
#define ATA_PRIMARY_LBA_LOW      0x1F3
#define ATA_PRIMARY_LBA_MID      0x1F4
#define ATA_PRIMARY_LBA_HIGH     0x1F5
#define ATA_PRIMARY_DRIVE        0x1F6
#define ATA_PRIMARY_COMMAND      0x1F7
#define ATA_PRIMARY_STATUS       0x1F7

void ata_read_sector(uint32_t lba, uint16_t *buffer) {
    outb(ATA_PRIMARY_DRIVE, 0xE0 | ((lba >> 24) & 0x0F));
    outb(ATA_PRIMARY_SECCOUNT, 1);
    outb(ATA_PRIMARY_LBA_LOW, (uint8_t)lba);
    outb(ATA_PRIMARY_LBA_MID, (uint8_t)(lba >> 8));
    outb(ATA_PRIMARY_LBA_HIGH, (uint8_t)(lba >> 16));
    outb(ATA_PRIMARY_COMMAND, 0x20); // READ SECTORS

    // Wait for BSY to clear and DRQ to set
    while (inb(ATA_PRIMARY_STATUS) & 0x80);
    while (!(inb(ATA_PRIMARY_STATUS) & 0x08));

    // Read 256 words (512 bytes)
    for (int i = 0; i < 256; i++) {
        buffer[i] = inw(ATA_PRIMARY_DATA);
    }
}
void ata_write_sector(uint32_t lba, uint16_t *buffer) {
    outb(ATA_PRIMARY_DRIVE, 0xE0 | ((lba >> 24) & 0x0F));
    outb(ATA_PRIMARY_SECCOUNT, 1);
    outb(ATA_PRIMARY_LBA_LOW, (uint8_t)lba);
    outb(ATA_PRIMARY_LBA_MID, (uint8_t)(lba >> 8));
    outb(ATA_PRIMARY_LBA_HIGH, (uint8_t)(lba >> 16));
    outb(ATA_PRIMARY_COMMAND, 0x30); // WRITE SECTORS

    // Wait for BSY to clear and DRQ to set
    while (inb(ATA_PRIMARY_STATUS) & 0x80);
    while (!(inb(ATA_PRIMARY_STATUS) & 0x08));

    // Write 256 words (512 bytes)
    for (int i = 0; i < 256; i++) {
        outw(ATA_PRIMARY_DATA, buffer[i]);
    }
    
    // Flush
    outb(ATA_PRIMARY_COMMAND, 0xE7); // CACHE FLUSH
    while (inb(ATA_PRIMARY_STATUS) & 0x80);
}

static uint32_t current_ledger_lba = 20000;
void ata_append_ledger(const char* msg, uint32_t frame) {
    uint16_t buffer[256];
    for (int i = 0; i < 256; i++) buffer[i] = 0;
    
    // Header
    buffer[0] = 0xAE61; // 'AE' 'G' 'I'
    buffer[1] = (uint16_t)frame;
    
    // Message copy
    char* char_buf = (char*)&buffer[2];
    for (int i = 0; i < 508 && msg[i]; i++) {
        char_buf[i] = msg[i];
    }
    
    ata_write_sector(current_ledger_lba++, buffer);
    if (current_ledger_lba > 20100) current_ledger_lba = 20000; // Loop with ghost archival logic (Phase 123)
}
