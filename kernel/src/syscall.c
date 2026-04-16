#include <stdint.h>

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

extern FramebufferInfo g_fb;
void kprint(FramebufferInfo *fb, uint32_t x, uint32_t y, const char *str, uint32_t color);

// Sovereign System Call Table
void syscall_handler(uint64_t syscall_num, uint64_t arg1, uint64_t arg2, uint64_t arg3) {
    switch (syscall_num) {
        case 1: // SYS_PRINT
            kprint(&g_fb, (uint32_t)arg1, (uint32_t)arg2, (const char*)arg3, 0xFF00FF);
            break;
        case 2: // SYS_EXIT
            // In a real OS, we would terminate the task. 
            // Here, we just print a message for the 'Apex' demo.
            kprint(&g_fb, 40, 480, "USER APP: MISSION ACCOMPLISHED (SYSCALL EXIT)", 0x00FFFF);
            break;
        case 3: // SYS_YIELD
            {
                void schedule();
                schedule();
            }
            break;
        case 4: // SYS_TUNE_KERNEL (Arc 9 Evo-Link)
            {
                // arg1: Task ID, arg2: Parameter Type (0: Priority, 1: Energy), arg3: Value
                void kernel_tune(uint32_t tid, uint32_t param, uint32_t val);
                kernel_tune((uint32_t)arg1, (uint32_t)arg2, (uint32_t)arg3);
            }
            break;
    }
}
