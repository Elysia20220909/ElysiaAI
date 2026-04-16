#ifndef TASK_H
#define TASK_H

#include <stdint.h>

typedef enum {
    TASK_READY,
    TASK_RUNNING,
    TASK_WAITING,
    TASK_KILLED
} task_state_t;

typedef struct tcb {
    uint32_t id;
    uint32_t priority;
    task_state_t state;
    uint64_t rip;
    uint64_t rsp;
    uint64_t cpu_id;
    struct tcb* next;
} tcb_t;

void scheduler_init();
void task_create(void (*entry)(), uint32_t priority);
void schedule();

#endif
