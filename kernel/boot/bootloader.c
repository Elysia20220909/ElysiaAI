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
void draw_pixel_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t color);
void draw_rect_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint32_t color);
void kprint_to(uint32_t* buffer, uint32_t x, uint32_t y, const char* str, uint32_t color);
void swap_buffers();
void list_root_dir(char* out_list, int max_len);
void init_gdt();
void init_idt();
void init_fat32();
void refresh_explorer();
void create_task(int id, void* entry_point, void* stack_top);
void render_desktop();

// --- TEST USER APP (Simulated Ring 3 Load) ---
void sovereign_app_main() {
    const char* msg = "SOVEREIGN APEX: RING 3 APP ACTIVE";
    
    // SYSCALL: SYS_PRINT (num=1, x=600, y=100, str=msg)
    __asm__ volatile (
        "movq $1, %%rax\n"
        "movq $600, %%rdi\n"
        "movq $100, %%rsi\n"
        "movq %0, %%rdx\n"
        "int $0x80\n"
        : : "r"(msg) : "rax", "rdi", "rsi", "rdx"
    );

    // SYSCALL: SYS_EXIT (num=2)
    __asm__ volatile (
        "movq $2, %%rax\n"
        "int $0x80\n"
        : : : "rax"
    );

    while(1);
}

// Background GUI Task
void task_desktop() {
    while(1) {
        render_desktop();
        for(volatile int i=0; i<100000; i++); 
    }
}

EFI_STATUS efi_main(EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable) {
    SystemTable->ConOut->Reset(SystemTable->ConOut, 0);
    SystemTable->ConOut->OutputString(SystemTable->ConOut, L"ELYSIOS: ASCENDING TO THE SOVEREIGN APEX...\r\n");

    EFI_GUID gop_guid = EFI_GRAPHICS_OUTPUT_PROTOCOL_GUID;
    EFI_GRAPHICS_OUTPUT_PROTOCOL *gop = 0;
    SystemTable->BootServices->LocateProtocol(&gop_guid, 0, (void**)&gop);

    g_fb.base_address = gop->Mode->FrameBufferBase;
    g_fb.width = gop->Mode->Info->HorizontalResolution;
    g_fb.height = gop->Mode->Info->VerticalResolution;
    g_fb.pixels_per_scanline = gop->Mode->Info->PixelsPerScanLine;

    // 1. Initial State
    draw_aurora_splash(&g_fb);
    kprint(&g_fb, 40, 40, "SOVEREIGN APEX (V10.0) - FINAL SYSTEM STATE", 0xFFFFFF);

    // 2. Achieve Sovereignty
    uint64_t map_size=0, map_key=0, desc_size=0; uint32_t desc_ver=0;
    SystemTable->BootServices->GetMemoryMap(&map_size, 0, &map_key, &desc_size, &desc_ver);
    static uint8_t map_buffer[16384];
    SystemTable->BootServices->GetMemoryMap(&map_size, (EFI_MEMORY_DESCRIPTOR*)map_buffer, &map_key, &desc_size, &desc_ver);
    SystemTable->BootServices->ExitBootServices(ImageHandle, map_key);

    // 3. Initialize Ultimate Architecture
    init_gdt(); // Protection Boundaries
    init_idt(); // Reactive Events
    init_fat32(); // Persistence
    refresh_explorer(); // Asset Discovery

    // 4. Spawn the Multiverse
    static uint8_t stack_app[8192];
    static uint8_t stack_gui[8192];
    
    // Task 0: The User Application (Executing through Syscalls)
    create_task(0, sovereign_app_main, (void*)&stack_app[8191]);
    
    // Task 1: The System Environment (Desktop)
    create_task(1, task_desktop, (void*)&stack_gui[8191]);

    while(1);

    return EFI_SUCCESS;
}
