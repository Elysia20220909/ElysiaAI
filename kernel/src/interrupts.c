#include <stdint.h>
#include "../include/uefi.h"

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

void kprint(FramebufferInfo *fb, uint32_t x, uint32_t y, const char *str, uint32_t color);
void draw_rect(FramebufferInfo *fb, uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint32_t color);

extern FramebufferInfo g_fb;

// --- PIC ---
#define PIC1_COMMAND 0x20
#define PIC1_DATA    0x21
#define PIC2_COMMAND 0xA0
#define PIC2_DATA    0xA1

void outb(uint16_t port, uint8_t val) {
    __asm__ volatile ("outb %b0, %w1" : : "a"(val), "Nd"(port));
}

uint8_t inb(uint16_t port) {
    uint8_t ret;
    __asm__ volatile ("inb %w1, %b0" : "=a"(ret) : "Nd"(port));
    return ret;
}

void outw(uint16_t port, uint16_t val) {
    __asm__ volatile ("outw %w0, %w1" : : "a"(val), "Nd"(port));
}

uint16_t inw(uint16_t port) {
    uint16_t ret;
    __asm__ volatile ("inw %w1, %w0" : "=a"(ret) : "Nd"(port));
    return ret;
}

void pic_init() {
    outb(PIC1_COMMAND, 0x11);
    outb(PIC2_COMMAND, 0x11);
    outb(PIC1_DATA, 0x20);
    outb(PIC2_DATA, 0x28);
    outb(PIC1_DATA, 0x04);
    outb(PIC2_DATA, 0x02);
    outb(PIC1_DATA, 0x01);
    outb(PIC2_DATA, 0x01);
    outb(PIC1_DATA, 0x0); // Unmask Master
    outb(PIC2_DATA, 0x0); // Unmask Slave
}

void pit_init(uint32_t frequency) {
    uint32_t divisor = 1193182 / frequency;
    outb(0x43, 0x36);
    outb(0x40, (uint8_t)(divisor & 0xFF));
    outb(0x40, (uint8_t)((divisor >> 8) & 0xFF));
}

// --- IDT ---
typedef struct {
    uint16_t isr_low; uint16_t kernel_cs; uint8_t ist;
    uint8_t attributes; uint16_t isr_mid; uint32_t isr_high; uint32_t reserved;
} __attribute__((packed)) idt_entry_t;

typedef struct { uint16_t limit; uint64_t base; } __attribute__((packed)) idtr_t;

__attribute__((aligned(16))) static idt_entry_t idt[256];
static idtr_t idtr;

extern void* isr_stub_table[];
extern void load_idt(idtr_t* idtr);

void set_idt_gate(int vector, void* isr) {
    uint64_t addr = (uint64_t)isr;
    idt[vector].isr_low = addr & 0xFFFF;
    idt[vector].kernel_cs = 0x08;
    idt[vector].attributes = 0x8E;
    idt[vector].isr_mid = (addr >> 16) & 0xFFFF;
    idt[vector].isr_high = (addr >> 32) & 0xFFFFFFFF;
}

void init_mouse(); // from mouse.c
void init_idt() {
    pic_init();
    pit_init(100);
    init_mouse();
    for (int i = 0; i < 48; i++) {
        set_idt_gate(i, isr_stub_table[i]);
    }
    idtr.base = (uint64_t)&idt;
    idtr.limit = sizeof(idt) - 1;
    load_idt(&idtr);
    __asm__ volatile ("sti");
}

void keyboard_handler(); 
void mouse_handler();
uint64_t scheduler(uint64_t rsp);

void interrupt_handler(uint64_t vector) {
    if (vector == 0x20) {
        // Handled by assembly scheduler call
        outb(PIC1_COMMAND, 0x20);
    } else if (vector == 0x21) {
        keyboard_handler();
        outb(PIC1_COMMAND, 0x20);
    } else if (vector == 0x2C) { // IRQ 12 (Keyboard + 0x28 + 4?) Actually IRQ 12 is at 0x20 + 12 = 0x2C
        mouse_handler();
        outb(PIC2_COMMAND, 0x20); // Slave
        outb(PIC1_COMMAND, 0x20); // Master
    } else if (vector < 32) {
        draw_rect(&g_fb, 100, 100, g_fb.width - 200, 200, 0xFF0000);
        kprint(&g_fb, 120, 120, "SOVEREIGN EXCEPTION", 0xFFFFFF);
        while(1);
    }
}
