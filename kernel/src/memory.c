#include "../include/uefi.h"

typedef struct {
    uint64_t total_ram;
    uint64_t free_ram;
    uint64_t reserved_ram;
} MemoryStats;

void parse_memory_map(EFI_MEMORY_DESCRIPTOR *map, uint64_t map_size, uint64_t descriptor_size, MemoryStats *stats) {
    stats->total_ram = 0;
    stats->free_ram = 0;
    stats->reserved_ram = 0;

    uint64_t num_descriptors = map_size / descriptor_size;

    for (uint64_t i = 0; i < num_descriptors; i++) {
        EFI_MEMORY_DESCRIPTOR *desc = (EFI_MEMORY_DESCRIPTOR *)((uint8_t *)map + (i * descriptor_size));
        uint64_t size = desc->NumberOfPages * 4096;

        stats->total_ram += size;
        
        // UEFI Memory Types: 7 = ConventionalMemory (Free RAM)
        if (desc->Type == 7) {
            stats->free_ram += size;
        } else {
            stats->reserved_ram += size;
        }
    }
}
