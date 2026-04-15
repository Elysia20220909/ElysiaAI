#include <stdint.h>

void ata_read_sector(uint32_t lba, uint16_t *buffer);

typedef struct {
    uint8_t  jmp[3];
    uint8_t  oem[8];
    uint16_t bytes_per_sector;
    uint8_t  sectors_per_cluster;
    uint16_t reserved_sectors;
    uint8_t  fats;
    uint16_t root_entries;
    uint16_t total_sectors_short;
    uint8_t  media_type;
    uint16_t fat_size_short;
    uint16_t sectors_per_track;
    uint16_t heads;
    uint32_t hidden_sectors;
    uint32_t total_sectors_long;
    uint32_t fat_size_long;
    uint16_t flags;
    uint16_t version;
    uint32_t root_cluster;
    // ... more fields ...
} __attribute__((packed)) FAT32_BPB;

typedef struct {
    uint8_t  name[11];
    uint8_t  attr;
    uint8_t  reserved;
    uint8_t  creation_time_tenth;
    uint16_t creation_time;
    uint16_t creation_date;
    uint16_t last_access_date;
    uint16_t first_cluster_high;
    uint16_t last_write_time;
    uint16_t last_write_date;
    uint16_t first_cluster_low;
    uint32_t file_size;
} __attribute__((packed)) FAT_DirectoryEntry;

static uint32_t root_dir_sector;

void init_fat32() {
    uint16_t boot_sector[256];
    ata_read_sector(0, boot_sector);
    FAT32_BPB *bpb = (FAT32_BPB*)boot_sector;
    
    // Calculate Root Directory location
    // FAT32 does not have a fixed size root dir like FAT16
    uint32_t fat_start = bpb->reserved_sectors;
    uint32_t data_start = fat_start + (bpb->fats * bpb->fat_size_long);
    root_dir_sector = data_start + (bpb->root_cluster - 2) * bpb->sectors_per_cluster;
}

void list_root_dir(char* out_list, int max_len) {
    uint16_t dir_sector[256];
    ata_read_sector(root_dir_sector, dir_sector);
    FAT_DirectoryEntry *entries = (FAT_DirectoryEntry*)dir_sector;
    
    int current_len = 0;
    for (int i = 0; i < 16; i++) { // 16 entries per 512B sector
        if (entries[i].name[0] == 0x00) break; // End of entries
        if (entries[i].name[0] == 0xE5) continue; // Deleted
        if (entries[i].attr & 0x08) continue; // Vol Label
        
        // Simple name extraction
        for(int j=0; j<8; j++) {
            if (entries[i].name[j] == ' ') break;
            if (current_len < max_len - 2) out_list[current_len++] = entries[i].name[j];
        }
        if (current_len < max_len - 1) out_list[current_len++] = ' ';
    }
    out_list[current_len] = '\0';
}
