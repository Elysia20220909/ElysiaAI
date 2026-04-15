#include <stdint.h>

typedef struct {
    uint16_t limit_low;
    uint16_t base_low;
    uint8_t  base_mid;
    uint8_t  access;
    uint8_t  granularity;
    uint8_t  base_high;
} __attribute__((packed)) gdt_entry_t;

typedef struct {
    uint16_t limit;
    uint64_t base;
} __attribute__((packed)) gdtr_t;

__attribute__((aligned(4096))) static gdt_entry_t gdt[5];
static gdtr_t gdtr;

void set_gdt_gate(int num, uint32_t base, uint32_t limit, uint8_t access, uint8_t gran) {
    gdt[num].base_low    = (base & 0xFFFF);
    gdt[num].base_mid    = (base >> 16) & 0xFF;
    gdt[num].base_high   = (base >> 24) & 0xFF;
    gdt[num].limit_low   = (limit & 0xFFFF);
    gdt[num].granularity = ((limit >> 16) & 0x0F) | (gran & 0xF0);
    gdt[num].access      = access;
}

void init_gdt() {
    gdtr.limit = (sizeof(gdt_entry_t) * 5) - 1;
    gdtr.base  = (uint64_t)&gdt;

    set_gdt_gate(0, 0, 0, 0, 0);                // Null segment
    set_gdt_gate(1, 0, 0xFFFFFFFF, 0x9A, 0xAF); // Kernel Code (0x08)
    set_gdt_gate(2, 0, 0xFFFFFFFF, 0x92, 0xCF); // Kernel Data (0x10)
    set_gdt_gate(3, 0, 0xFFFFFFFF, 0xFA, 0xAF); // User Code (0x18)
    set_gdt_gate(4, 0, 0xFFFFFFFF, 0xF2, 0xCF); // User Data (0x20)

    extern void load_gdt(gdtr_t* gdtr);
    load_gdt(&gdtr);
}
