#include <stdint.h>

void outb(uint16_t port, uint8_t val);
uint8_t inb(uint16_t port);

static int8_t mouse_cycle = 0;
static uint8_t mouse_byte[3];
int32_t mouse_x = 0;
int32_t mouse_y = 0;

void mouse_wait(uint8_t type) {
    uint32_t timeout = 100000;
    if (type == 0) {
        while (timeout--) { if ((inb(0x64) & 1) == 1) return; }
    } else {
        while (timeout--) { if ((inb(0x64) & 2) == 0) return; }
    }
}

void mouse_write(uint8_t a_write) {
    mouse_wait(1);
    outb(0x64, 0xD4);
    mouse_wait(1);
    outb(0x60, a_write);
}

uint8_t mouse_read() {
    mouse_wait(0);
    return inb(0x60);
}

void init_mouse() {
    uint8_t status;
    mouse_wait(1);
    outb(0x64, 0xA8); // Enable Auxiliary Device
    
    mouse_wait(1);
    outb(0x64, 0x20); // Get Status Byte
    mouse_wait(0);
    status = (inb(0x60) | 2); 
    mouse_wait(1);
    outb(0x64, 0x60); // Set Status Byte
    mouse_wait(1);
    outb(0x60, status);
    
    mouse_write(0xF4); // Enable Data Reporting
    mouse_read();      // Acknowledgement
}

void mouse_handler() {
    uint8_t status = inb(0x64);
    if (!(status & 0x01) || !(status & 0x20)) return;

    mouse_byte[mouse_cycle++] = inb(0x60);

    if (mouse_cycle == 3) {
        mouse_cycle = 0;
        
        // Byte 0: Flags (Bit 0: Left, 1: Right, 2: Middle, 3: Always 1, 4: X sign, 5: Y sign...)
        if (mouse_byte[0] & 0x80 || mouse_byte[0] & 0x40) return; // Overflow
        
        int32_t dx = mouse_byte[1];
        int32_t dy = mouse_byte[2];

        if (mouse_byte[0] & 0x10) dx |= 0xFFFFFF00; // X Sign
        if (mouse_byte[0] & 0x20) dy |= 0xFFFFFF00; // Y Sign

        mouse_x += dx;
        mouse_y -= dy; // Y is inverted in raw PS/2

        // Boundary checks happen in the compositor
    }
}
