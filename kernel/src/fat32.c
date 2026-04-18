#include <stdint.h>
#include "vfs.h"

#ifndef NULL
#define NULL ((void*)0)
#endif

void ata_read_sector(uint32_t lba, uint16_t *buffer);
void ata_write_sector(uint32_t lba, uint16_t *buffer);

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
    uint16_t fs_info;
    uint16_t backup_boot;
    uint8_t  reserved[12];
    uint8_t  drive_num;
    uint8_t  reserved1;
    uint8_t  boot_sig;
    uint32_t volume_id;
    uint8_t  volume_label[11];
    uint8_t  system_id[8];
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
static uint32_t fat_start_sector;
static uint32_t data_start_sector;
static uint32_t sectors_per_cluster;

void init_fat32() {
    uint16_t boot_sector[256];
    ata_read_sector(0, boot_sector);
    FAT32_BPB *bpb = (FAT32_BPB*)boot_sector;
    
    sectors_per_cluster = bpb->sectors_per_cluster;
    fat_start_sector = bpb->reserved_sectors;
    data_start_sector = fat_start_sector + (bpb->fats * bpb->fat_size_long);
    root_dir_sector = data_start_sector + (bpb->root_cluster - 2) * sectors_per_cluster;
}

uint32_t get_next_cluster(uint32_t cluster) {
    uint16_t fat_sector[256];
    uint32_t fat_offset = cluster * 4;
    uint32_t sector = fat_start_sector + (fat_offset / 512);
    uint32_t offset = (fat_offset % 512) / 2; // Word offset
    
    ata_read_sector(sector, fat_sector);
    uint32_t next = ((uint32_t*)fat_sector)[offset / 2];
    return next & 0x0FFFFFFF;
}

int list_root_dir(char* out_list, int max_len) {
    uint16_t dir_sector[256];
    ata_read_sector(root_dir_sector, dir_sector);
    FAT_DirectoryEntry *entries = (FAT_DirectoryEntry*)dir_sector;
    
    int current_len = 0;
    for (int i = 0; i < 16; i++) {
        if (entries[i].name[0] == 0x00) break;
        if (entries[i].name[0] == 0xE5) continue;
        if (entries[i].attr & 0x08) continue;
        
        for(int j=0; j<8; j++) {
            if (entries[i].name[j] == ' ') break;
            if (current_len < max_len - 2) out_list[current_len++] = entries[i].name[j];
        }
        if (entries[i].attr != 0x10) { // If not a directory
             if (current_len < max_len - 2) out_list[current_len++] = '.';
             for(int j=8; j<11; j++) {
                if (entries[i].name[j] == ' ') break;
                if (current_len < max_len - 2) out_list[current_len++] = entries[i].name[j];
             }
        }
        if (current_len < max_len - 1) out_list[current_len++] = ' ';
    }
    out_list[current_len] = '\0';
    return 0;
}

int fat32_read_file(const char* filename, char* buffer, uint32_t max_size) {
    uint16_t dir_sector[256];
    ata_read_sector(root_dir_sector, dir_sector);
    FAT_DirectoryEntry *entries = (FAT_DirectoryEntry*)dir_sector;
    
    // 1. Find the file
    uint32_t first_cluster = 0;
    uint32_t file_size = 0;
    for (int i = 0; i < 16; i++) {
        if (entries[i].name[0] == 0x00) break;
        // Simple name comparison (ignoring extension for now for simplicity, or assume filename is 8.3)
        // Correct implementation would match 8+3
        char short_name[12];
        int k = 0;
        for(int j=0; j<8; j++) if(entries[i].name[j] != ' ') short_name[k++] = entries[i].name[j];
        if(entries[i].attr != 0x10) {
            short_name[k++] = '.';
            for(int j=8; j<11; j++) if(entries[i].name[j] != ' ') short_name[k++] = entries[i].name[j];
        }
        short_name[k] = '\0';
        
        int match = 1;
        for(int m=0; filename[m] != '\0' || short_name[m] != '\0'; m++) {
            if (filename[m] != short_name[m]) { match = 0; break; }
        }
        
        if (match) {
            first_cluster = ((uint32_t)entries[i].first_cluster_high << 16) | entries[i].first_cluster_low;
            file_size = entries[i].file_size;
            break;
        }
    }
    
    if (first_cluster == 0) return -1;
    
    // 2. Read the file
    uint32_t current_cluster = first_cluster;
    uint32_t bytes_read = 0;
    while (current_cluster < 0x0FFFFFF8 && bytes_read < max_size && bytes_read < file_size) {
        uint32_t lba = data_start_sector + (current_cluster - 2) * sectors_per_cluster;
        for (uint32_t s = 0; s < sectors_per_cluster; s++) {
            uint16_t sector_data[256];
            ata_read_sector(lba + s, sector_data);
            
            uint32_t to_copy = 512;
            if (file_size - bytes_read < 512) to_copy = file_size - bytes_read;
            if (max_size - bytes_read < to_copy) to_copy = max_size - bytes_read;
            
            for (uint32_t b = 0; b < to_copy; b++) {
                buffer[bytes_read++] = ((char*)sector_data)[b];
            }
            if (bytes_read >= max_size || bytes_read >= file_size) break;
        }
        current_cluster = get_next_cluster(current_cluster);
    }
    buffer[bytes_read] = '\0';
    return (int)bytes_read;
}

int fat32_write_file(const char* filename, const char* buffer, uint32_t size) {
    uint16_t dir_sector[256];
    ata_read_sector(root_dir_sector, dir_sector);
    FAT_DirectoryEntry *entries = (FAT_DirectoryEntry*)dir_sector;
    
    // 1. Find the file
    uint32_t first_cluster = 0;
    for (int i = 0; i < 16; i++) {
        if (entries[i].name[0] == 0x00) break;
        char short_name[12];
        int k = 0;
        for(int j=0; j<8; j++) if(entries[i].name[j] != ' ') short_name[k++] = entries[i].name[j];
        if(entries[i].attr != 0x10) {
            short_name[k++] = '.';
            for(int j=8; j<11; j++) if(entries[i].name[j] != ' ') short_name[k++] = entries[i].name[j];
        }
        short_name[k] = '\0';
        
        int match = 1;
        for(int m=0; filename[m] != '\0' || short_name[m] != '\0'; m++) {
            if (filename[m] != short_name[m]) { match = 0; break; }
        }
        
        if (match) {
            first_cluster = ((uint32_t)entries[i].first_cluster_high << 16) | entries[i].first_cluster_low;
            // Update file size in directory entry
            entries[i].file_size = size;
            ata_write_sector(root_dir_sector, dir_sector);
            break;
        }
    }
    
    if (first_cluster == 0) return -1;
    
    // 2. Write the file data (Overwriting existing clusters)
    uint32_t current_cluster = first_cluster;
    uint32_t bytes_written = 0;
    while (current_cluster < 0x0FFFFFF8 && bytes_written < size) {
        uint32_t lba = data_start_sector + (current_cluster - 2) * sectors_per_cluster;
        for (uint32_t s = 0; s < sectors_per_cluster; s++) {
            uint16_t sector_data[256];
            // Clear sector and copy new data
            for(int b=0; b<512; b++) ((char*)sector_data)[b] = 0;
            
            uint32_t to_copy = 512;
            if (size - bytes_written < 512) to_copy = size - bytes_written;
            
            for (uint32_t b = 0; b < to_copy; b++) {
                ((char*)sector_data)[b] = buffer[bytes_written++];
            }
            
            ata_write_sector(lba + s, sector_data);
            if (bytes_written >= size) break;
        }
        current_cluster = get_next_cluster(current_cluster);
    }
    return (int)bytes_written;
}

// VFS Wrappers
static int fat32_vfs_open(file_t* file, const char* path) {
    // Simple direct name copy for now (Phase 115 Alpha)
    for(int i=0; i<MAX_PATH && path[i]; i++) file->name[i] = path[i];
    return 0; 
}

static int fat32_vfs_read(file_t* file, char* buffer, uint32_t size) {
    return fat32_read_file(file->name, buffer, size);
}

static int fat32_vfs_write(file_t* file, const char* buffer, uint32_t size) {
    return fat32_write_file(file->name, buffer, size);
}

static file_ops_t fat32_ops = {
    .open = fat32_vfs_open,
    .read = fat32_vfs_read,
    .write = fat32_vfs_write,
    .close = NULL,
    .readdir = list_root_dir
};

static fs_t fat32_fs = {
    .name = "fat32",
    .ops = &fat32_ops
};

void vfs_init_fat32() {
    init_fat32();
    vfs_register_fs(&fat32_fs);
}
