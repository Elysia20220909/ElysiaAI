#ifndef TASK_H
#define TASK_H

#include <stdint.h>

typedef enum {
    AGENT_NONE = 0,
    AGENT_SENTINEL,
    AGENT_SHIELD,
    AGENT_SCOUT,
    AGENT_ANALYST
} agent_type_t;

typedef struct tcb {
    uint32_t id;
    int32_t priority;
    task_state_t state;
    uint64_t rip;
    uint64_t rsp;
    uint32_t swarm_id;
    agent_type_t agent_type;
    uint64_t cpu_id;
    struct tcb* next;
} tcb_t;

#define PRIORITY_SWARM 15
#define PRIORITY_GHOST 20

void scheduler_init();
void task_create(void (*entry)(), uint32_t priority);
void task_swarm_spawn(agent_type_t type, uint32_t swarm_id);
void kernel_tune(uint32_t tid, uint32_t param, uint32_t val);

void schedule();

#endif
