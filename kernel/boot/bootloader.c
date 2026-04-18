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
void init_gdt();
void init_idt();
void vfs_init_fat32();
void scheduler_init();
void task_create(void (*entry)(), uint32_t priority);
void refresh_explorer();
void refresh_ui();
void load_manifest();
int fat32_read_file(const char* filename, char* buffer, uint32_t max_size);

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
    uint64_t schedule(uint64_t);
    while(1) {
        refresh_ui();
        schedule(0); // Yield to other tasks (Phase 126.3)
    }
}

extern int is_guest_mode;

void verify_sentinel() {
    char key[64];
    int read = fat32_read_file("SENTINEL.KEY", key, 64);
    
    // Check for the Master Key: AEGIS-SVR-777
    const char* master_key = "AEGIS-SVR-777";
    int match = 1;
    if (read < 13) match = 0;
    else {
        for(int i=0; i<13; i++) {
            if (key[i] != master_key[i]) { match = 0; break; }
        }
    }
    
    if (!match) {
        is_guest_mode = 1;
    }
}

EFI_STATUS efi_main(EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable) {
    SystemTable->ConOut->Reset(SystemTable->ConOut, 0);
    SystemTable->ConOut->OutputString(SystemTable->ConOut, L"ELYSIOS: ASCENDING TO THE SOVEREIGN APEX...\r\n");

    EFI_GUID gop_guid = EFI_GRAPHICS_OUTPUT_PROTOCOL_GUID;
    EFI_GRAPHICS_OUTPUT_PROTOCOL *gop = 0;
    
    // Attempt 1: LocateProtocol
    EFI_STATUS status = SystemTable->BootServices->LocateProtocol(&gop_guid, 0, (void**)&gop);

    // Attempt 2: HandleProtocol on ConsoleOutHandle (Fallback)
    if (status != EFI_SUCCESS || !gop) {
        status = SystemTable->BootServices->HandleProtocol(SystemTable->ConsoleOutHandle, &gop_guid, (void**)&gop);
    }

    // Attempt 3: HandleProtocol on ImageHandle (Fallback)
    if (status != EFI_SUCCESS || !gop) {
        status = SystemTable->BootServices->HandleProtocol(ImageHandle, &gop_guid, (void**)&gop);
    }

    // Attempt 4: LocateHandleBuffer (Deep Search)
    if (status != EFI_SUCCESS || !gop) {
        EFI_HANDLE *handle_buffer = 0;
        uint64_t handle_count = 0;
        // Index 19 is LocateHandle (Wait, I used index 36 for LocateHandleBuffer)
        // Let's use the typed version from uefi.h
        typedef EFI_STATUS (*EFI_LOCATE_HANDLE_BUFFER) (uint32_t SearchType, EFI_GUID *Protocol, void *SearchKey, uint64_t *NoHandles, EFI_HANDLE **Buffer);
        EFI_LOCATE_HANDLE_BUFFER locate_handle_buffer = (EFI_LOCATE_HANDLE_BUFFER)SystemTable->BootServices->LocateHandleBuffer;
        
        status = locate_handle_buffer(2, &gop_guid, 0, &handle_count, &handle_buffer); // 2 = ByProtocol
        if (status == EFI_SUCCESS && handle_count > 0) {
            status = SystemTable->BootServices->HandleProtocol(handle_buffer[0], &gop_guid, (void**)&gop);
        }
    }

    if (status != EFI_SUCCESS || !gop) {
        SystemTable->ConOut->OutputString(SystemTable->ConOut, L"CRITICAL: GOP NOT FOUND VIA ANY METHOD. CHECK VM SETTINGS.\r\n");
        while(1);
    }

    g_fb.base_address = gop->Mode->FrameBufferBase;
    g_fb.width = gop->Mode->Info->HorizontalResolution;
    g_fb.height = gop->Mode->Info->VerticalResolution;
    g_fb.pixels_per_scanline = gop->Mode->Info->PixelsPerScanLine;

    // 1. Initial State
    draw_aurora_splash(&g_fb);
    kprint(&g_fb, 40, 40, "SOVEREIGN APEX PRO (V41.0) - AQUEOUS SECURITY", 0xFFFFFF);

    // 2. Achieve Sovereignty
    uint64_t map_size=0, map_key=0, desc_size=0; uint32_t desc_ver=0;
    static uint8_t map_buffer[32768]; // Increased to 32KB
    map_size = sizeof(map_buffer);

    status = SystemTable->BootServices->GetMemoryMap(&map_size, (EFI_MEMORY_DESCRIPTOR*)map_buffer, &map_key, &desc_size, &desc_ver);
    if (status != EFI_SUCCESS) {
        SystemTable->ConOut->OutputString(SystemTable->ConOut, L"FAILED TO GET MEMORY MAP\r\n");
        while(1);
    }

    status = SystemTable->BootServices->ExitBootServices(ImageHandle, map_key);
    if (status != EFI_SUCCESS) {
        // One retry with updated map
        SystemTable->BootServices->GetMemoryMap(&map_size, (EFI_MEMORY_DESCRIPTOR*)map_buffer, &map_key, &desc_size, &desc_ver);
        SystemTable->BootServices->ExitBootServices(ImageHandle, map_key);
    }

    // 3. Initialize Ultimate Architecture
    init_gdt(); // Protection Boundaries
    init_idt(); // Reactive Events
    vfs_init_fat32(); // Persistence via VFS
    scheduler_init(); // Tasking via Scheduler
    
    // 4. Security Verification (Gatekeeper)
    verify_sentinel();
    
    refresh_explorer(); // Asset Discovery
    load_manifest(); // Sovereignty Verification

    // 5. Spawn the Multiverse
    // Task 0: The User Application (Neural Trigger Ready)
    task_create(sovereign_app_main, 5);
    
    // Task 1: The System Environment (Desktop)
    task_create(task_desktop, 10);

    uint64_t schedule(uint64_t);
    while(1) {
        schedule(0); // The Multiverse Heartbeat (Phase 126.3)
    }

    return EFI_SUCCESS;
}
