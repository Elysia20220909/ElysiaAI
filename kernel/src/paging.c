#include <stdint.h>

typedef uint64_t pt_entry;

#define PT_PRESENT (1ULL << 0)
#define PT_WRITABLE (1ULL << 1)
#define PT_USER (1ULL << 2)
#define PT_PS (1ULL << 7) // 2MB Page

// Static Page Tables for the Kernel (4-level)
// In a real OS, these would be dynamic, but for the Sovereign Sanctuary, 
// we pre-allocate them to ensure stability during the transition.
__attribute__((aligned(4096))) pt_entry pml4[512];
__attribute__((aligned(4096))) pt_entry pdpt[512];
__attribute__((aligned(4096))) pt_entry pd[512]; // We'll map 1GB using 2MB pages for simplicity

void setup_paging() {
    // Zero out tables
    for (int i = 0; i < 512; i++) {
        pml4[i] = 0;
        pdpt[i] = 0;
        pd[i] = 0;
    }

    // PML4[0] points to PDPT
    pml4[0] = (uint64_t)pdpt | PT_PRESENT | PT_WRITABLE;

    // PDPT[0] points to PD
    pdpt[0] = (uint64_t)pd | PT_PRESENT | PT_WRITABLE;

    // PD maps 1GB using 512 * 2MB pages (Identity Mapping)
    for (int i = 0; i < 512; i++) {
        pd[i] = (uint64_t)(i * 0x200000) | PT_PRESENT | PT_WRITABLE | PT_PS;
    }

    // The CPU CR3 register must be updated with (uint64_t)pml4 to activate.
    // This is done in the bootloader via assembly or inline asm.
}
