#include "../include/uefi.h"

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

extern FramebufferInfo g_fb;

// Sovereign API
void draw_aurora_splash(FramebufferInfo *fb);
void kprint(FramebufferInfo *fb, uint32_t x, uint32_t y, const char *str, uint32_t color);
void draw_rect(FramebufferInfo *fb, uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint32_t color);
void init_idt();
void create_task(int id, void* entry_point, void* stack_top);

// Task A: The Pulse of Logic
void task_a() {
    int x = 0;
    while(1) {
        draw_rect(&g_fb, 40 + (x % 200), 500, 10, 10, 0x00FFFF);
        for(volatile int i=0; i<1000000; i++); // Delay
        draw_rect(&g_fb, 40 + (x % 200), 500, 10, 10, 0x333333); // Erase
        x++;
    }
}

// Task B: The Echo of Time
void task_b() {
    int count = 0;
    while(1) {
        if (count % 2 == 0) {
            kprint(&g_fb, 40, 520, "SYSTEM STATUS: RUNNING (MULTITASKING ACTIVE)", 0x00FF00);
        } else {
            kprint(&g_fb, 40, 520, "SYSTEM STATUS: RUNNING (SCHEDULER HEARTBEAT)", 0x00FF00);
        }
        for(volatile int i=0; i<50000000; i++); // Longer delay
        count++;
    }
}

EFI_STATUS efi_main(EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable) {
    SystemTable->ConOut->Reset(SystemTable->ConOut, 0);
    SystemTable->ConOut->OutputString(SystemTable->ConOut, L"ELYSIOS: INITIALIZING THE ULTIMATE SOVEREIGN...\r\n");

    EFI_GUID gop_guid = EFI_GRAPHICS_OUTPUT_PROTOCOL_GUID;
    EFI_GRAPHICS_OUTPUT_PROTOCOL *gop = 0;
    SystemTable->BootServices->LocateProtocol(&gop_guid, 0, (void**)&gop);

    g_fb.base_address = gop->Mode->FrameBufferBase;
    g_fb.width = gop->Mode->Info->HorizontalResolution;
    g_fb.height = gop->Mode->Info->VerticalResolution;
    g_fb.pixels_per_scanline = gop->Mode->Info->PixelsPerScanLine;

    draw_aurora_splash(&g_fb);
    kprint(&g_fb, 40, 40, "ELYSIOS ULTIMATE SOVEREIGN (V7.0)", 0xFFFFFF);
    kprint(&g_fb, 40, 70, "INTERACTIVE BARE-METAL KERNEL IS NOW LIVE.", 0x00FFFF);

    // 1. Exit Firmware
    uint64_t map_size=0, map_key=0, desc_size=0; uint32_t desc_ver=0;
    SystemTable->BootServices->GetMemoryMap(&map_size, 0, &map_key, &desc_size, &desc_ver);
    static uint8_t map_buffer[16384];
    SystemTable->BootServices->GetMemoryMap(&map_size, (EFI_MEMORY_DESCRIPTOR*)map_buffer, &map_key, &desc_size, &desc_ver);
    SystemTable->BootServices->ExitBootServices(ImageHandle, map_key);

    // 2. Initialize Interrupts (Timer & Keyboard)
    init_idt();

    // 3. Spawning the Multiverse (Tasks)
    static uint8_t stack_a[8192];
    static uint8_t stack_b[8192];
    
    create_task(0, task_a, (void*)&stack_a[8191]);
    create_task(1, task_b, (void*)&stack_b[8191]);

    kprint(&g_fb, 40, 260, "SOVEREIGN SHELL READY. PLEASE TYPE:", 0xFFFF00);

    // Main loop: Become Task 0 context basically
    while(1);

    return EFI_SUCCESS;
}
