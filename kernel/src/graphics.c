#include "../include/uefi.h"
#include "../include/font.h"

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

// Exported for the Sovereign API
FramebufferInfo g_fb;

void draw_pixel(FramebufferInfo *fb, uint32_t x, uint32_t y, uint32_t color) {
    if (x >= fb->width || y >= fb->height) return;
    uint32_t *pixel = (uint32_t *)(fb->base_address + (y * fb->pixels_per_scanline + x) * 4);
    *pixel = color;
}

void draw_rect(FramebufferInfo *fb, uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint32_t color) {
    for (uint32_t i = 0; i < h; i++) {
        for (uint32_t j = 0; j < w; j++) {
            draw_pixel(fb, x + j, y + i, color);
        }
    }
}

void draw_char(FramebufferInfo *fb, uint32_t x, uint32_t y, char c, uint32_t color) {
    unsigned char *bitmap = font_8x16[(unsigned char)c];
    for (int i = 0; i < 16; i++) {
        for (int j = 0; j < 8; j++) {
            if ((bitmap[i] << j) & 0x80) {
                draw_pixel(fb, x + j, y + i, color);
            }
        }
    }
}

void kprint(FramebufferInfo *fb, uint32_t x, uint32_t y, const char *str, uint32_t color) {
    uint32_t current_x = x;
    while (*str) {
        draw_char(fb, current_x, y, *str, color);
        current_x += 8;
        str++;
    }
}

void draw_aurora_splash(FramebufferInfo *fb) {
    for (uint32_t y = 0; y < fb->height; y++) {
        for (uint32_t x = 0; x < fb->width; x++) {
            uint8_t r = (x * 255) / fb->width;
            uint8_t g = (y * 255) / fb->height;
            uint8_t b = 150;
            uint32_t color = (r << 16) | (g << 8) | b;
            draw_pixel(fb, x, y, color);
        }
    }
}
