#include <stdint.h>

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

extern FramebufferInfo g_fb;
void kprint(FramebufferInfo *fb, uint32_t x, uint32_t y, const char *str, uint32_t color);
void draw_char(FramebufferInfo *fb, uint32_t x, uint32_t y, char c, uint32_t color);
uint8_t inb(uint16_t port);

static int shell_x = 40;
static int shell_y = 300;
char keyboard_buffer[256];
int keyboard_ptr = 0;
int keyboard_submitted = 0;

// Simple Scancode Set 1 (Simplified)
static char scancode_map[128] = {
    [0x1E] = 'A', [0x30] = 'B', [0x2E] = 'C', [0x20] = 'D', [0x12] = 'E',
    [0x21] = 'F', [0x22] = 'G', [0x23] = 'H', [0x17] = 'I', [0x24] = 'J',
    [0x25] = 'K', [0x26] = 'L', [0x32] = 'M', [0x31] = 'N', [0x18] = 'O',
    [0x19] = 'P', [0x10] = 'Q', [0x13] = 'R', [0x1F] = 'S', [0x14] = 'T',
    [0x16] = 'U', [0x2F] = 'V', [0x11] = 'W', [0x2D] = 'X', [0x15] = 'Y',
    [0x2C] = 'Z', [0x39] = ' ', [0x0B] = '0', [0x02] = '1', [0x03] = '2',
    [0x04] = '3', [0x05] = '4', [0x06] = '5', [0x07] = '6', [0x08] = '7',
    [0x09] = '8', [0x0A] = '9', [0x1C] = '\n'
};

void keyboard_handler() {
    uint8_t scancode = inb(0x60);
    
    // Ignore key release (high bit set)
    if (scancode & 0x80) return;

    char c = scancode_map[scancode];
    if (c == 0) return;

    if (c == '\n') {
        shell_x = 40;
        shell_y += 20;
        keyboard_buffer[keyboard_ptr] = '\0';
        keyboard_submitted = 1; 
    } else {
        if (keyboard_ptr < 255) {
            keyboard_buffer[keyboard_ptr++] = c;
            keyboard_buffer[keyboard_ptr] = '\0';
        }
        draw_char(&g_fb, shell_x, shell_y, c, 0x00FF00); // Sovereign Green Typed Text
        shell_x += 8;
    }
}
