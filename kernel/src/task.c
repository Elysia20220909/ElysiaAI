#include <stdint.h>

typedef struct {
    uint64_t rsp;
    uint8_t  state; // 1 = Running, 0 = Stopped
} Task;

static Task tasks[2];
static int current_task = 0;

void kprint(void* fb, uint32_t x, uint32_t y, const char *str, uint32_t color);
extern void* g_fb_ptr;

// The Sovereign Task Creator
void create_task(int id, void* entry_point, void* stack_top) {
    uint64_t *stack = (uint64_t*)stack_top;
    
    // Initial Stack Frame for iretq
    stack[-1] = 0x10;          // SS
    stack[-2] = (uint64_t)stack_top; // RSP
    stack[-3] = 0x202;         // RFLAGS (Interrupts enabled)
    stack[-4] = 0x08;          // CS
    stack[-5] = (uint64_t)entry_point; // RIP
    
    // Register Context (Initial state for pop/iret)
    for (int i = 6; i <= 20; i++) {
        stack[-i] = 0; // rbp, r15..rdi
    }
    
    tasks[id].rsp = (uint64_t)&stack[-20];
    tasks[id].state = 1;
}

// The Sovereign Scheduler (Heartbeat of Logic)
uint64_t scheduler(uint64_t current_rsp) {
    tasks[current_task].rsp = current_rsp;
    
    // Simple Round-Robin
    current_task = (current_task + 1) % 2;
    
    return tasks[current_task].rsp;
}

void timer_handler(uint64_t rsp) {
    // This will be called from assembly to perform the switch
}
