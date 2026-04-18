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
            task_pool[i].priority = (int32_t)priority;
            task_pool[i].state = TASK_READY;
            task_pool[i].rip = (uint64_t)entry;
            task_pool[i].swarm_id = 0;
            task_pool[i].agent_type = AGENT_NONE;
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

uint64_t schedule(uint64_t stack_pointer) {
    if (ready_queue == NULL) return stack_pointer;
    
    // Save current task stack pointer if it exists and is valid (non-zero)
    if (current_task != NULL && stack_pointer != 0) {
        current_task->rsp = stack_pointer;
        current_task->state = TASK_READY;
    }

    // Simple Round Robin Scheduler
    if (current_task == NULL) {
        current_task = ready_queue;
    } else {
        current_task = current_task->next;
        if (current_task == NULL) current_task = ready_queue;
    }
    
    current_task->state = TASK_RUNNING;
    return current_task->rsp;
}

void task_neural_spawn(const char* intent) {
    // Neural lattice expansion logic
    // For now, satisfy linker and provide a placeholder for the sovereign agent
}

extern void autonomous_sentinel(); 
extern void autonomous_shield();
extern void autonomous_scout();

void task_swarm_spawn(agent_type_t type, uint32_t swarm_id) {
    void (*entry)() = NULL;
    int32_t priority = PRIORITY_SWARM;

    switch(type) {
        case AGENT_SENTINEL: entry = autonomous_sentinel; break;
        case AGENT_SHIELD:   entry = autonomous_shield;   break;
        case AGENT_SCOUT:    entry = autonomous_scout;    break;
        default: return;
    }

    for (int i = 0; i < MAX_TASKS; i++) {
        if (task_pool[i].state == TASK_KILLED) {
            task_pool[i].id = next_task_id++;
            task_pool[i].priority = priority;
            task_pool[i].state = TASK_READY;
            task_pool[i].rip = (uint64_t)entry;
            task_pool[i].swarm_id = swarm_id;
            task_pool[i].agent_type = type;
            task_pool[i].cpu_id = 0;

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

void kernel_tune(uint32_t tid, uint32_t param, uint32_t val) {
    for (int i = 0; i < MAX_TASKS; i++) {
        if (task_pool[i].id == tid && task_pool[i].state != TASK_KILLED) {
            if (param == 0) task_pool[i].priority = val;
            return;
        }
    }
}
