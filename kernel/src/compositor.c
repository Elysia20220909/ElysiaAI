#include <stdint.h>

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

typedef struct {
    int32_t x, y;
    uint32_t w, h;
    const char* title;
    uint32_t color;
} Window;

extern FramebufferInfo g_fb;
extern int32_t mouse_x, mouse_y;

__attribute__((aligned(4096))) static uint32_t backbuffer[1920 * 1080];

void draw_pixel_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t color) {
    if (x >= g_fb.width || y >= g_fb.height) return;
    buffer[y * g_fb.width + x] = color;
}

void draw_rect_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint32_t color) {
    for (uint32_t i = 0; i < h; i++) {
        for (uint32_t j = 0; j < w; j++) {
            draw_pixel_to(buffer, x + j, y + i, color);
        }
    }
}

void swap_buffers() {
    uint32_t *front = (uint32_t *)g_fb.base_address;
    for (uint32_t i = 0; i < g_fb.height; i++) {
        for (uint32_t j = 0; j < g_fb.width; j++) {
            front[i * g_fb.pixels_per_scanline + j] = backbuffer[i * g_fb.width + j];
        }
    }
}

void list_root_dir(char* out_list, int max_len);

static Window system_window = {100, 100, 400, 200, "SYSTEM MONITOR", 0x222222};
static Window explorer_window = {550, 150, 400, 400, "SOVEREIGN EXPLORER", 0x333344};

static char file_list[256] = "SCANNING DISK...";

void refresh_explorer() {
    list_root_dir(file_list, 256);
}

void render_desktop() {
    // 1. Aurora Background
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            uint8_t r = (x * 80) / g_fb.width;
            uint8_t g = (y * 80) / g_fb.height;
            uint8_t b = 100;
            backbuffer[y * g_fb.width + x] = (r << 16) | (g << 8) | b;
        }
    }

    // 2. Taskbar
    draw_rect_to(backbuffer, 0, g_fb.height - 40, g_fb.width, 40, 0x111111);
    kprint_to(backbuffer, 10, g_fb.height - 25, "ELYSIOS SOVEREIGNTY", 0x00FFFF);

    // 3. System Window
    draw_rect_to(backbuffer, system_window.x, system_window.y, system_window.w, system_window.h, system_window.color);
    draw_rect_to(backbuffer, system_window.x, system_window.y, system_window.w, 30, 0x111111);
    kprint_to(backbuffer, system_window.x + 10, system_window.y + 10, system_window.title, 0xFFFFFF);
    kprint_to(backbuffer, system_window.x + 20, system_window.y + 60, "KERNEL: MASTER", 0x00FF00);
    kprint_to(backbuffer, system_window.x + 20, system_window.y + 90, "STORAGE: ATA/FAT32", 0x00FF00);

    // 4. Explorer Window (The new Sovereign feature)
    draw_rect_to(backbuffer, explorer_window.x, explorer_window.y, explorer_window.w, explorer_window.h, explorer_window.color);
    draw_rect_to(backbuffer, explorer_window.x, explorer_window.y, explorer_window.w, 30, 0x111111);
    kprint_to(backbuffer, explorer_window.x + 10, explorer_window.y + 10, explorer_window.title, 0xFFFFFF);
    
    // Display File List
    kprint_to(backbuffer, explorer_window.x + 20, explorer_window.y + 60, "FILES ON DISK:", 0xFFFF00);
    kprint_to(backbuffer, explorer_window.x + 20, explorer_window.y + 90, file_list, 0x00FFFF);

    // 5. Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    draw_rect_to(backbuffer, mouse_x, mouse_y, 10, 10, 0xFFFFFF);
    draw_rect_to(backbuffer, mouse_x, mouse_y, 2, 14, 0x00FFFF);

    swap_buffers();
}
