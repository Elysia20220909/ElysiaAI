#include "task.h"
#include <stddef.h>

#define MAX_TASKS 64

static tcb_t task_pool[MAX_TASKS];
static tcb_t* ready_queue = NULL;
static tcb_t* current_task = NULL;
static uint32_t next_task_id = 1;

void scheduler_init() {
    for (int i = 0; i < MAX_TASKS; i++) {
        task_pool[i].id = 0;
        task_pool[i].state = TASK_KILLED;
        task_pool[i].next = NULL;
    }
    ready_queue = NULL;
    current_task = NULL;
}

void task_create(void (*entry)(), uint32_t priority) {
    for (int i = 0; i < MAX_TASKS; i++) {
        if (task_pool[i].state == TASK_KILLED) {
            task_pool[i].id = next_task_id++;
            task_pool[i].priority = priority;
            task_pool[i].state = TASK_READY;
            task_pool[i].rip = (uint64_t)entry;
            task_pool[i].cpu_id = 0; // Simulated BSP core
            
            // Add to ready queue (Simple append for now)
            if (ready_queue == NULL) {
                ready_queue = &task_pool[i];
            } else {
                tcb_t* last = ready_queue;
                while (last->next) last = last->next;
                last->next = &task_pool[i];
            }
            return;
        }
    }
}

void schedule() {
    if (ready_queue == NULL) return;
    
    // Simple Round Robin Scheduler
    if (current_task == NULL) {
        current_task = ready_queue;
    } else {
        current_task->state = TASK_READY;
        current_task = current_task->next;
        if (current_task == NULL) current_task = ready_queue;
    }
    
    current_task->state = TASK_RUNNING;
    // Context switch logic would go here (assembly-level)
}

extern void autonomous_sentinel(); // From compositor.c
void task_neural_spawn(const char* intent) {
    if (intent[0] == 'S' && intent[1] == 'E' && intent[2] == 'C') {
        // Intent: 'SECURE_LATTICE'
        task_create(autonomous_sentinel, 10); 
    }
}

void kernel_tune(uint32_t tid, uint32_t param, uint32_t val) {
    for (int i = 0; i < MAX_TASKS; i++) {
        if (task_pool[i].id == tid && task_pool[i].state != TASK_KILLED) {
            if (param == 0) task_pool[i].priority = val;
            return;
        }
    }
}
