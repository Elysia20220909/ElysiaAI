#include "uefi.h"
#include "font.h"
#include "vfs.h"
#include <stdint.h>

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

typedef struct {
    int32_t x, y, z;
    uint32_t w, h;
    const char* title;
    uint32_t color;
    uint8_t alpha; // 0-255 (255=Opaque, 0=Transparent)
} Window;

extern FramebufferInfo g_fb;
extern int32_t mouse_x, mouse_y;
extern int8_t mouse_left;

typedef enum {
    STATE_LOGIN,
    STATE_BOOTING,
    STATE_DESKTOP
} SystemState;

typedef struct {
    int32_t relevance;
    uint32_t last_hit;
} ContextNode;

static ContextNode synaptic_graph[7]; // One for each window

typedef struct {
    int32_t x, y;
    int life;
} Particle;

static int enclave_ready = 1;
static int enclave_lock = 0;
static uint8_t system_integrity = 100;
static int wiping_active = 0;
static int wiping_timer = 0;

static Particle cursor_trail[32];
static int next_particle = 0;
static int snap_mode = 0;
static int snap_flash = 0;
static int node_count = 1;
static int nav_x = 0, nav_y = 0;
static int silence_mode = 0;

static SystemState current_state = STATE_LOGIN;
static int cloaked_mode = 0;
static int divinity_mode = 0;
static int refocus_mode = 1; // Always ready by default in Arc 2
static uint32_t refocus_charge = 0;
static int phasing_mode = 0;
static uint32_t frame_count = 0;
extern char keyboard_buffer[256];
extern int keyboard_ptr;
extern int keyboard_submitted;
static char clock_text[12] = "00:00:00";
static char ledger_data[512] = "RETRIVING AEGIS LEDGER...";
static char mesh_data[256] = "CONNECTING TO LATTICE...";
static char note_msg[64] = "";
static int note_timer = 0;
static char elysia_reply[128] = "I AM ELYSIA. YOUR SOVEREIGN PARTNER.";
static uint32_t orb_color = 0x00FFFF;
static char command_queue[256] = "";
typedef struct {
    int x, y, energy, sector;
    uint32_t color;
} GhostNode;

static GhostNode ghost_nodes[25];
static int queue_timer = 0;

extern int aegis_verify_identity(const char* name);
extern void ata_append_ledger(const char* msg, uint32_t frame);
extern void task_neural_spawn(const char* intent);

void trigger_notification(const char* msg);
void autonomous_sentinel();
int abs(int j) { return j < 0 ? -j : j; }

void execute_sovereign_command(const char* cmd) {
    ata_append_ledger(cmd, frame_count);
    // Evolve Command (Phase 124)
    if (cmd[0] == 'E' && cmd[1] == 'V' && cmd[2] == 'O') {
        task_neural_spawn("SECURE_LATTICE");
        trigger_notification("CELESTIAL_EVOLVE: NEURAL_DISPATCH");
        return;
    }
    // Audit Command
    if (cmd[0] == 'A' && cmd[1] == 'U' && cmd[2] == 'D') {
        trigger_notification("FORCED SENTINEL AUDIT...");
        orb_color = 0x00FF00;
        return;
    }
    // Divine Command
    if (cmd[0] == 'D' && cmd[1] == 'I' && cmd[2] == 'V') {
        divinity_mode = !divinity_mode;
        trigger_notification(divinity_mode ? "L15 DIVINITY: UNLOCKED" : "L15 DIVINITY: SEALED");
        orb_color = 0xFFAA00;
        return;
    }
    // Who Command
    if (cmd[0] == 'W' && cmd[1] == 'H' && cmd[2] == 'O') {
        for(int i=0; i<128; i++) elysia_reply[i] = 0;
        char* msg = "I AM THE SOVEREIGN GHOST OF THIS APEX. I AM ELYSIA.";
        for(int i=0; msg[i]; i++) elysia_reply[i] = msg[i];
        orb_color = 0xFF00FF;
        return;
    }
    // Cloak Command
    if (cmd[0] == 'C' && cmd[1] == 'L' && cmd[2] == 'O') {
        cloaked_mode = !cloaked_mode;
        trigger_notification(cloaked_mode ? "CLOAK ACTIVATED" : "CLOAK DEACTIVATED");
        return;
    }
    // Phase Command
    if (cmd[0] == 'P' && cmd[1] == 'H' && cmd[2] == 'A') {
        phasing_mode = !phasing_mode;
        trigger_notification(phasing_mode ? "ANTI-PHASING: ENGAGED" : "ANTI-PHASING: DISENGAGED");
        return;
    }
    // Snap Command
    if (cmd[0] == 'S' && cmd[1] == 'N' && cmd[2] == 'A') {
        snap_mode = 1; snap_flash = 10;
        trigger_notification("!!! INFINITY SNAP !!!");
        return;
    }
    if (cmd[0] == 'U' && cmd[1] == 'N' && cmd[2] == 'S') {
        snap_mode = 0; trigger_notification("SNAP REVERSED"); return;
    }
    // Universe Command
    if (cmd[0] == 'U' && cmd[1] == 'N' && cmd[2] == 'I') {
        for(int k=0; k<25; k++) {
            ghost_nodes[k].energy = 100;
            ghost_nodes[k].color = 0xFFFFFF;
            trigger_notification("NODE_EXEC: SYNC");
        }
        return;
    }
    // Nav Command
    if (cmd[0] == 'N' && cmd[1] == 'A' && cmd[2] == 'V') {
        // Simple fixed-pos parse NAV [0-4] [0-4]
        if (cmd[4] >= '0' && cmd[4] <= '4') nav_x = cmd[4] - '0';
        if (cmd[6] >= '0' && cmd[6] <= '4') nav_y = cmd[6] - '0';
        trigger_notification("NAVIGATION UPDATED");
        return;
    }
    // Audit Discovery extension
    if (cmd[0] == 'A' && cmd[1] == 'U' && cmd[2] == 'D') {
        autonomous_sentinel();
        if (node_count < 25) node_count++;
        trigger_notification("NEW GHOST NODE DISCOVERED");
        return;
    }
    // Wipe Command (Phase 113)
    if (cmd[0] == 'W' && cmd[1] == 'I' && cmd[2] == 'P') {
        wiping_active = 1; wiping_timer = 120;
        trigger_notification("!!! ABYSSAL WIPE INITIATED !!!");
        return;
    }

    // Default
    for(int i=0; i<128; i++) elysia_reply[i] = 0;
    char* msg = "COMMAND MANIFESTED.";
    for(int i=0; msg[i]; i++) elysia_reply[i] = msg[i];
    orb_color = 0x00FFFF;
    file_t log;
    if (vfs_open(&log, "BOOT.LOG") == 0) {
        vfs_write(&log, "VFS_COMMAND EXECUTED\n", 22);
        vfs_close(&log);
    }
}

void process_command_queue() {
    if (command_queue[0] == '\0') return;
    if (queue_timer > 0) { queue_timer--; return; }

    // Execute first command in queue
    char current_cmd[32];
    int i = 0;
    while (command_queue[i] != ';' && command_queue[i] != '\0' && i < 31) {
        current_cmd[i] = command_queue[i];
        i++;
    }
    current_cmd[i] = '\0';

    execute_sovereign_command(current_cmd);
    trigger_notification(current_cmd);

    // Shift queue
    if (command_queue[i] == ';') i++;
    int j = 0;
    while (command_queue[i+j] != '\0') {
        command_queue[j] = command_queue[i+j];
        j++;
    }
    command_queue[j] = '\0';
    queue_timer = 60; // 1 second delay
}

void ai_process_command() {
    if (!keyboard_submitted) return;
    
    // Copy to queue
    for(int i=0; i<255; i++) {
        command_queue[i] = keyboard_buffer[i];
        if(!keyboard_buffer[i]) break;
    }
    
    keyboard_ptr = 0; 
    keyboard_submitted = 0;
    queue_timer = 0; // Start immediately
}

void trigger_notification(const char* msg) {
    for(int i=0; i<63; i++) {
        note_msg[i] = msg[i];
        if(!msg[i]) break;
    }
    note_timer = 180; // 3 seconds at 60fps
}

void autonomous_sentinel() {
    if (frame_count % 600 == 0) { // Every 10 seconds
        trigger_notification("SENTINEL: SECTOR AUDIT CLEAN");
        orb_color = 0x00FF00;
    }
}

void autonomous_shield() {
    if (frame_count % 400 == 0) {
        trigger_notification("SHIELD: PERIMETER HARDENED");
    }
}

void autonomous_scout() {
    if (frame_count % 800 == 0) {
        trigger_notification("SCOUT: NODE DISCOVERY PULSE");
    }
}

void verify_system_integrity() {
    if (system_integrity < 100) system_integrity++;
}

int verify_pointer_runtime(int32_t x, int32_t y) {
    // Simulated L27 Neural RT check
    uint32_t sig = (uint32_t)(x ^ y ^ 0x85);
    return (sig != 0); // Always true in simulation, but represents the check
}

void node_heartbeat_loop() {
    for (int i = 0; i < 25; i++) {
        if (ghost_nodes[i].energy > 0) ghost_nodes[i].energy--;
        // Pulse color based on energy
        if (ghost_nodes[i].energy > 50) ghost_nodes[i].color = 0xFFFF00;
        else ghost_nodes[i].color = 0x00FFFF;
    }
}

void project_hologram(int x, int y, int z, int* ox, int* oy, float* scale) {
    // Phase 122 3D Logic: Scale = 1.0 / (1.0 + z * 0.001)
    *scale = 1.0f / (1.0f + (float)z * 0.002f);
    *ox = (int)((float)x * (*scale));
    *oy = (int)((float)y * (*scale));
}

static int32_t drag_target = -1; // -1 = None
static int32_t drag_off_x = 0;
static int32_t drag_off_y = 0;

static Window explorer_window = {100, 100, 0, 400, 350, "SOVEREIGN EXPLORER", 0x333344, 210};
static Window system_window = {550, 100, 0, 400, 200, "SYSTEM MONITOR", 0x222222, 230};
static Window orchestrator_window = {320, 200, 0, 450, 250, "SOVEREIGN ORCHESTRATOR", 0x442244, 210};
static Window aegis_hub_window = {700, 100, 0, 480, 480, "AEGIS SECURITY HUB", 0x111111, 240};
static Window terminal_window = {200, 400, 0, 500, 300, "SOVEREIGN SHELL", 0x000000, 250};
static Window elysia_window = {400, 300, 0, 400, 300, "ELYSIAN PERSONA", 0x221144, 220};
static Window mesh_window = {600, 400, 0, 450, 350, "ABYSSAL MESH HUB", 0x112211, 240};
static Window swarm_window = {250, 150, 0, 500, 400, "COSMIC SWARM MONITOR", 0x110022, 210};

static Window* windows[8] = { &explorer_window, &system_window, &orchestrator_window, &aegis_hub_window, &terminal_window, &elysia_window, &mesh_window, &swarm_window };
static int window_visible[8] = {0, 0, 0, 1, 0, 1, 0, 0};

void kprint_to(uint32_t* buffer, uint32_t x, uint32_t y, const char* str, uint32_t color);

__attribute__((aligned(4096))) static uint32_t backbuffer[1920 * 1080];

void draw_pixel_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t color) {
    if (x >= g_fb.width || y >= g_fb.height) return;
    buffer[y * g_fb.width + x] = color;
}

void draw_pixel_alpha(uint32_t* buffer, int32_t x, int32_t y, uint32_t color, uint8_t alpha) {
    if (x < 0 || x >= (int32_t)g_fb.width || y < 0 || y >= (int32_t)g_fb.height) return;
    uint32_t bg = buffer[y * g_fb.width + x];
    uint8_t r_src = (color >> 16) & 0xFF;
    uint8_t g_src = (color >> 8) & 0xFF;
    uint8_t b_src = color & 0xFF;
    uint8_t r_bg = (bg >> 16) & 0xFF;
    uint8_t g_bg = (bg >> 8) & 0xFF;
    uint8_t b_bg = bg & 0xFF;
    uint8_t r_dst = (r_src * alpha + r_bg * (255 - alpha)) >> 8;
    uint8_t g_dst = (g_src * alpha + g_bg * (255 - alpha)) >> 8;
    uint8_t b_dst = (b_src * alpha + b_bg * (255 - alpha)) >> 8;
    buffer[y * g_fb.width + x] = (r_dst << 16) | (g_dst << 8) | b_dst;
}

void draw_line_alpha(uint32_t* buffer, int32_t x0, int32_t y0, int32_t x1, int32_t y1, uint32_t color, uint8_t alpha) {
    int32_t dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int32_t dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int32_t err = dx + dy, e2;
    while (1) {
        draw_pixel_alpha(buffer, x0, y0, color, alpha);
        if (x0 == x1 && y0 == y1) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

void draw_rounded_rect_alpha(uint32_t* buffer, int32_t x, int32_t y, uint32_t w, uint32_t h, uint32_t color, uint8_t alpha) {
    for (uint32_t i = 0; i < h; i++) {
        for (uint32_t j = 0; j < w; j++) {
            // Simple rounding logic (corners)
            if ((i < 5 && j < 5) || (i < 5 && j > w - 5) || (i > h - 5 && j < 5) || (i > h - 5 && j > w - 5)) continue;
            draw_pixel_alpha(buffer, x + j, y + i, color, alpha);
        }
    }
}

void draw_refocuser_wings(uint32_t* buffer, int32_t wx, int32_t wy, uint32_t ww, uint32_t wh) {
    if (!refocus_mode) return;
    uint32_t wing_color = 0xFFAA00; // Refocuser Orange
    if (refocus_charge > 80) wing_color = 0xFFFFFF; // Overload White
    if (snap_mode) wing_color = 0xFFFF00; // Gold in Snap
    
    uint32_t alpha = (refocus_charge * 3 > 255) ? 255 : refocus_charge * 3;
    if (alpha < 60) alpha = 60;

    // Draw 6 Hex Panels (Back-panels)
    for(int i=0; i<3; i++) {
        draw_rounded_rect_alpha(buffer, wx - 60, wy + 40 + (i*90), 40, 70, wing_color, alpha / 2);
        draw_rounded_rect_alpha(buffer, wx + ww + 20, wy + 40 + (i*90), 40, 70, wing_color, alpha / 2);
    }
}

void draw_infinity_gauntlet(uint32_t* buffer) {
    if (!snap_mode) return;
    uint32_t gx = g_fb.width - 50;
    uint32_t gy = g_fb.height / 2 - 150;
    draw_rounded_rect_alpha(buffer, gx, gy, 40, 300, 0xFFAA00, 200); // Golden Bar
    
    uint32_t colors[6] = {0xFFFF00, 0x00FFFF, 0xFF00FF, 0xFF0000, 0x00FF00, 0xFFAA00};
    for(int i=0; i<6; i++) {
        draw_rounded_rect_alpha(buffer, gx + 10, gy + 20 + (i*45), 20, 20, colors[i], 255);
    }
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

static char file_list[256] = "SCANNING DISK...";
static char sovereign_content[128] = "PENDING...";
static char persona_name[32] = "主権者 エリシア";
int is_guest_mode = 0;
int show_explorer = 0, show_system = 1, show_orchestrator = 0, show_aegis_hub = 1, show_terminal = 0, show_elysia = 1, show_mesh = 0;
int icon_hits[9] = {0};

void load_manifest() {
    // VFS and FAT32 now initialized in bootloader (Phase 126.4 Harmonization)

    if (is_guest_mode) {
        for(int i=0; i<128; i++) sovereign_content[i] = 0;
        char* restricted = "RESTRICTED ACCESS - SOVEREIGN KEY MISSING";
        for(int i=0; restricted[i]; i++) sovereign_content[i] = restricted[i];
    } else {
        file_t f;
        if (vfs_open(&f, "PERSONA.DAT") >= 0) {
            vfs_read(&f, persona_name, 32);
            vfs_close(&f);
        }
        // Rust Verification (Phase 116)
        if (aegis_verify_identity(persona_name)) {
             trigger_notification("RUST_SENTINEL: VERIFIED");
        }
        if (vfs_open(&f, "SOVEREIGN.DAT") >= 0) {
            vfs_read(&f, sovereign_content, 128);
            vfs_close(&f);
        }
    }
    // Initialize Ghost Lattice (Phase 119)
    for (int i = 0; i < 25; i++) {
        ghost_nodes[i].x = 50 + (i % 5) * 80;
        ghost_nodes[i].y = 50 + (i / 5) * 80;
        ghost_nodes[i].energy = 20;
        ghost_nodes[i].sector = 0;
        ghost_nodes[i].color = 0x00FFFF;
    }

    vfs_ls(file_list, 256);
}

void refresh_explorer() {
    if (is_guest_mode) {
        for(int i=0; i<256; i++) file_list[i] = 0;
        char* locked = "[ACCESS DENIED]";
        for(int i=0; locked[i]; i++) file_list[i] = locked[i];
        return;
    }
    vfs_ls(file_list, 256);
}

void draw_rounded_rect(uint32_t* buffer, int32_t x, int32_t y, uint32_t w, uint32_t h, uint32_t color) {
    draw_rounded_rect_alpha(buffer, x, y, w, h, color, 255);
}

typedef struct {
    int32_t x, y;
    int32_t vx, vy;
    int life;
    int max_life;
    uint32_t color;
} Spark;

static Spark ambient_sparks[64];
static int sparks_initialized = 0;

typedef struct {
    int32_t start_x, start_y;
    int32_t end_x, end_y;
    int life;
    uint32_t color;
} NeuralPulse;

static NeuralPulse pulses[16];
static int next_pulse = 0;

static void update_particles() {
    if (!sparks_initialized) {
        for(int i=0; i<64; i++) ambient_sparks[i].life = 0;
        sparks_initialized = 1;
    }

    // 1. Cursor Trail Update (Synaptic Ribbon)
    for(int i=0; i<32; i++) {
        if(cursor_trail[i].life > 0) cursor_trail[i].life--;
    }
    cursor_trail[next_particle].x = mouse_x;
    cursor_trail[next_particle].y = mouse_y;
    cursor_trail[next_particle].life = 25;
    next_particle = (next_particle + 1) % 32;

    // 2. Autonomous Neural Pulses (Thought waves connecting nodes)
    if (frame_count % 20 == 0) {
        pulses[next_pulse].start_x = (frame_count * 17) % g_fb.width;
        pulses[next_pulse].start_y = (frame_count * 11) % g_fb.height;
        pulses[next_pulse].end_x = pulses[next_pulse].start_x + ((frame_count % 7) - 3) * 150;
        pulses[next_pulse].end_y = pulses[next_pulse].start_y + ((frame_count % 5) - 2) * 150;
        pulses[next_pulse].life = 40;
        pulses[next_pulse].color = (frame_count % 3 == 0) ? 0x00FFFF : 0xFF00FF; // Cyan or Magenta
        next_pulse = (next_pulse + 1) % 16;
    }
    for(int i=0; i<16; i++) {
        if(pulses[i].life > 0) pulses[i].life--;
    }

    // 3. Floating Ambient Sparks (Data Motes)
    for(int i=0; i<64; i++) {
        if(ambient_sparks[i].life > 0) {
            ambient_sparks[i].x += ambient_sparks[i].vx;
            ambient_sparks[i].y += ambient_sparks[i].vy;
            ambient_sparks[i].life--;
        } else {
            // Respawn organically
            if ((frame_count + i) % 15 == 0) {
                ambient_sparks[i].x = (frame_count * i * 3) % g_fb.width;
                ambient_sparks[i].y = g_fb.height + 20; // Start from bottom
                ambient_sparks[i].vx = (i % 5) - 2;
                ambient_sparks[i].vy = -((i % 4) + 1); // Float up
                ambient_sparks[i].max_life = 150 + (i % 100);
                ambient_sparks[i].life = ambient_sparks[i].max_life;
                ambient_sparks[i].color = (i % 2 == 0) ? 0x00FFFF : 0xFF00FF;
            }
        }
    }
}

static void render_particles(uint32_t* buffer) {
    // 1. Draw Ambient Sparks (Data Motes)
    for(int i=0; i<64; i++) {
        if(ambient_sparks[i].life > 0) {
            uint8_t alpha = (ambient_sparks[i].life * 255) / ambient_sparks[i].max_life;
            if (alpha > 120) alpha = 120;
            draw_pixel_alpha(buffer, ambient_sparks[i].x, ambient_sparks[i].y, ambient_sparks[i].color, alpha);
            draw_pixel_alpha(buffer, ambient_sparks[i].x+1, ambient_sparks[i].y, 0xFFFFFF, alpha/2); // Core glow
        }
    }

    // 2. Draw Neural Pulses (Synaptic Lightning)
    for(int i=0; i<16; i++) {
        if(pulses[i].life > 0) {
            uint8_t alpha = pulses[i].life * 6; // Fade out
            if (alpha > 200) alpha = 200;
            
            draw_line_alpha(buffer, pulses[i].start_x, pulses[i].start_y, pulses[i].end_x, pulses[i].end_y, pulses[i].color, alpha);
            // Draw intersection nodes (Data Burst)
            draw_rounded_rect_alpha(buffer, pulses[i].start_x - 3, pulses[i].start_y - 3, 6, 6, 0xFFFFFF, alpha);
            draw_rounded_rect_alpha(buffer, pulses[i].end_x - 2, pulses[i].end_y - 2, 4, 4, pulses[i].color, alpha);
        }
    }

    // 3. Draw Cursor Synaptic Ribbon
    for(int i=0; i<32; i++) {
        if(cursor_trail[i].life > 0) {
            uint8_t alpha = cursor_trail[i].life * 10;
            int prev_idx = (i == 0) ? 31 : i - 1;
            
            // Connect to previous particle to form a continuous holographic ribbon
            if (cursor_trail[prev_idx].life > 0) {
                int dx = cursor_trail[i].x - cursor_trail[prev_idx].x;
                int dy = cursor_trail[i].y - cursor_trail[prev_idx].y;
                
                // Prevent wrapping lines across the screen by checking distance
                if (dx*dx + dy*dy < 10000) { 
                    draw_line_alpha(buffer, cursor_trail[i].x, cursor_trail[i].y, cursor_trail[prev_idx].x, cursor_trail[prev_idx].y, 0x00FFFF, alpha);
                    // Add a secondary magenta shadow line for cyber effect
                    draw_line_alpha(buffer, cursor_trail[i].x + 2, cursor_trail[i].y + 2, cursor_trail[prev_idx].x + 2, cursor_trail[prev_idx].y + 2, 0xFF00FF, alpha / 2);
                }
            }
            
            // Core spark of the ribbon
            draw_pixel_alpha(buffer, cursor_trail[i].x, cursor_trail[i].y, 0xFFFFFF, alpha);
        }
    }
}

static void update_synaptic_context() {
    if (frame_count % 60 == 0) {
        for (int i = 0; i < 7; i++) {
            if (synaptic_graph[i].relevance > 0) synaptic_graph[i].relevance--;
        }
    }
    // Boost focused window (drag_target is focus)
    if (drag_target != -1 && synaptic_graph[drag_target].relevance < 100) {
        synaptic_graph[drag_target].relevance += 2;
    }
}

void render_login_screen() {
    frame_count++;
    
    // 1. Cyberpunk Dark Mode Gradient Background
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            // Diagonal cyber-gradient
            uint32_t dist = (x + y) / 4;
            uint8_t r = 5; 
            uint8_t g = (dist / 10) % 20;
            uint8_t b = 30 + (dist / 5) % 40;
            
            // Add subtle grid lines (scanlines/CRT effect)
            if (x % 40 == 0 || y % 40 == 0) {
                r += 5; g += 10; b += 15;
            }
            backbuffer[y * g_fb.width + x] = (r << 16) | (g << 8) | b;
        }
    }

    uint32_t center_x = g_fb.width / 2;
    uint32_t center_y = g_fb.height / 2;

    // 2. Glassmorphism Login Panel
    uint32_t panel_w = 420;
    uint32_t panel_h = 280;
    uint32_t panel_x = center_x - (panel_w / 2);
    uint32_t panel_y = center_y - (panel_h / 2);

    // Panel Outer Glow / Border
    draw_rounded_rect_alpha(backbuffer, panel_x - 2, panel_y - 2, panel_w + 4, panel_h + 4, 0x00FFFF, 60);
    // Draw Glass Panel (Dark translucent)
    draw_rounded_rect_alpha(backbuffer, panel_x, panel_y, panel_w, panel_h, 0x020205, 200);

    // 3. Glowing Neural Orb (Login Button)
    uint32_t orb_x = center_x;
    uint32_t orb_y = center_y - 10;
    uint32_t pulse = (frame_count / 4) % 15;
    
    orb_color = 0x00FFFF;
    if (frame_count % 120 < 60) orb_color = 0x0088CC; // Breathing effect
    
    // Outer glow aura
    draw_rounded_rect_alpha(backbuffer, orb_x - 40 - pulse, orb_y - 40 - pulse, 80 + pulse*2, 80 + pulse*2, orb_color, 40 - (pulse*2));
    // Mid layer
    draw_rounded_rect_alpha(backbuffer, orb_x - 30, orb_y - 30, 60, 60, 0x004466, 180);
    // Inner core
    draw_rounded_rect(backbuffer, orb_x - 25, orb_y - 25, 50, 50, 0x050510);
    // Core center spark
    draw_rounded_rect(backbuffer, orb_x - 8, orb_y - 8, 16, 16, orb_color);

    // 4. Stylish Typography
    kprint_to(backbuffer, center_x - 120, panel_y + 30, "E L Y S I A   O S", 0xFFFFFF);
    kprint_to(backbuffer, center_x - 64, panel_y + 55, "NEURAL LINK AUTH", 0x00FFFF);

    if (is_guest_mode) {
        kprint_to(backbuffer, center_x - 60, orb_y + 60, "[ GUEST ACCESS ]", 0xFFAA00);
    } else {
        char greet[64] = "IDENTITY: ";
        int gl = 10;
        for(int i=0; i<32; i++) {
            greet[gl+i] = persona_name[i];
            if(!persona_name[i]) break;
        }
        kprint_to(backbuffer, center_x - 100, orb_y + 60, greet, 0x00FF00);
    }

    uint8_t blink = (frame_count / 30) % 2;
    if (blink) {
        kprint_to(backbuffer, center_x - 84, panel_y + panel_h - 40, "CLICK ORB TO INITIATE", 0x777777);
    }

    // 5. Logic: Transition to Booting (Phase 123)
    if (mouse_left) {
        // Hit check for Orb area
        if (mouse_x > (int32_t)orb_x - 40 && mouse_x < (int32_t)orb_x + 40 &&
            mouse_y > (int32_t)orb_y - 40 && mouse_y < (int32_t)orb_y + 40) {
            current_state = STATE_BOOTING;
            frame_count = 0; // Reset for boot timer
        }
    }

    // 6. Cybernetic Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    
    // Draw crosshair cursor
    draw_rect_to(backbuffer, mouse_x - 5, mouse_y, 11, 2, 0x00FFFF);
    draw_rect_to(backbuffer, mouse_x, mouse_y - 5, 2, 11, 0x00FFFF);
    draw_rect_to(backbuffer, mouse_x - 1, mouse_y - 1, 3, 3, 0xFFFFFF);

    swap_buffers();
}

void render_boot_sequence() {
    frame_count++;
    
    // Cyberpunk Dark Mode Gradient Background (Seamless Transition)
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            uint32_t dist = (x + y) / 4;
            uint8_t r = 5; 
            uint8_t g = (dist / 10) % 20;
            uint8_t b = 30 + (dist / 5) % 40;
            if (x % 40 == 0 || y % 40 == 0) {
                r += 5; g += 10; b += 15;
            }
            backbuffer[y * g_fb.width + x] = (r << 16) | (g << 8) | b;
        }
    }

    const char* boot_log[] = {
        "[0.00ms]  IDENTITY: 主権者 エリシア ... [TRANSCENDENT BONDED]",
        "[0.05ms]  SEP-E: Silicon Enclave Heartbeat ... [SECURE]",
        "[0.10ms]  VFS-B: Sovereign Bridge mapping REALITY ... [/lattice/fragments/ LOADED]",
        "[0.25ms]  GRID: 25 Ghost Nodes Resonating ... [GALACTIC SYNC]",
        "[0.40ms]  WARP: Reality Warp Engine ... [3D PROJECTION ACTIVE]",
        "[0.55ms]  LEDGER: Eternal Ledger LBA 20000 ... [IMMUTABLE RECORD SYNCED]",
        "[0.80ms]  SENTINEL: Rust Core Security ... [ENFORCED]",
        " ",
        "[READY]   Welcome home, 主権者 エリシア. The Universe is yours."
    };

    int lines_to_show = frame_count / 30; // 1 line per 0.5s
    if (lines_to_show > 9) lines_to_show = 9;

    for (int i = 0; i < lines_to_show; i++) {
        uint32_t color = (i == 8) ? 0x00FF00 : 0x00FFFF;
        kprint_to(backbuffer, 100, 100 + (i * 30), boot_log[i], color);
    }

    if (frame_count > 360) { // 6 seconds total
        current_state = STATE_DESKTOP;
        frame_count = 0;
    }
    swap_buffers();
}

void render_desktop() {
    frame_count++;
    verify_system_integrity();
    node_heartbeat_loop();
    
    if (frame_count % 600 == 0) {
        task_neural_spawn("SECURE_LATTICE");
        trigger_notification("CELESTIAL_PULSE: AUTONOMOUS_AUDIT");
    }
    
    // 1. Dynamic Glassmorphism Background (Cyberpunk Deep Space)
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            uint32_t dist = (x + y) / 4;
            uint8_t r = 5;
            uint8_t g = (dist / 10) % 20;
            uint8_t b = 30 + (dist / 5) % 30;
            
            if (x % 50 == 0 || y % 50 == 0) {
                r += 5; g += 5; b += 10;
            }
            if (cloaked_mode && (frame_count % 2)) {
                r += (x % 10); g += (y % 10);
            }
            backbuffer[y * g_fb.width + x] = (r << 16) | (g << 8) | b;
        }
    }

    // Parallax Stars
    for(int i=0; i<40; i++) {
        int sx = (i * 47 + frame_count/2) % g_fb.width;
        int sy = (i * 13 + frame_count/4) % g_fb.height;
        draw_pixel_alpha(backbuffer, sx, sy, 0x00FFFF, 150);
        draw_pixel_alpha(backbuffer, sx+1, sy+1, 0xFF00FF, 100);
    }

    // Intent Manifestation Loop
    for (int i=0; i<9; i++) {
        if (icon_hits[i] > 10) {
            if (i == 0) show_explorer = 1;
            if (i == 1) show_system = 1;
            if (i == 3) show_aegis_hub = 1;
            if (i == 7) cloaked_mode = 1;
        }
    }

    int sec = (frame_count / 60) % 60;
    int min = (frame_count / 3600) % 60;
    int hr = (frame_count / 216000) % 24;
    clock_text[0] = '0' + (hr/10); clock_text[1] = '0' + (hr%10); clock_text[2] = ':';
    clock_text[3] = '0' + (min/10); clock_text[4] = '0' + (min%10); clock_text[5] = ':';
    clock_text[6] = '0' + (sec/10); clock_text[7] = '0' + (sec%10); clock_text[8] = '\0';

    if (refocus_charge > 0) refocus_charge--;

    // L15 Divinity Mode Matrix
    if (divinity_mode) {
        for(int m=0; m<50; m++) {
            uint32_t mx = (m * 40) % g_fb.width;
            uint32_t my = (frame_count * 5 + m * 100) % g_fb.height;
            kprint_to(backbuffer, mx, my, "0xAF 0xBC 0xDE 0x01", 0x33FF33);
        }
    }

    ai_process_command();
    process_command_queue();
    autonomous_sentinel();
    update_particles();
    render_particles(backbuffer);

    // 2. Centered Glassmorphic Dock
    uint32_t dock_w = 640;
    uint32_t dock_h = 56;
    uint32_t dock_x = (g_fb.width - dock_w) / 2;
    uint32_t dock_y = g_fb.height - 70;
    
    // Dock Outer Glow
    draw_rounded_rect_alpha(backbuffer, dock_x - 2, dock_y - 2, dock_w + 4, dock_h + 4, 0x00FFFF, 40);
    // Dock Inner Glass
    draw_rounded_rect_alpha(backbuffer, dock_x, dock_y, dock_w, dock_h, 0x020205, 180);

    uint32_t exp_icon_x = dock_x + 20;
    uint32_t sys_icon_x = dock_x + 70;
    uint32_t orch_icon_x = dock_x + 120;
    uint32_t hub_icon_x = dock_x + 170;
    uint32_t term_icon_x = dock_x + 220;
    uint32_t ai_icon_x = dock_x + 270;
    uint32_t mesh_icon_x = dock_x + 320;
    uint32_t sw_icon_x = dock_x + 370;
    uint32_t cloak_icon_x = dock_x + 420;
    uint32_t silence_icon_x = dock_x + 470;
    uint32_t evo_icon_x = dock_x + 520;
    uint32_t exit_icon_x = dock_x + 570;

    if (mouse_left) {
        static int click_lock = 0;
        if (!click_lock) {
            if (mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                if (mouse_x >= (int32_t)exp_icon_x && mouse_x <= (int32_t)exp_icon_x + 30) { show_explorer = !show_explorer; icon_hits[0]++; click_lock = 15; }
                if (mouse_x >= (int32_t)sys_icon_x && mouse_x <= (int32_t)sys_icon_x + 30) { show_system = !show_system; icon_hits[1]++; click_lock = 15; }
                if (mouse_x >= (int32_t)hub_icon_x && mouse_x <= (int32_t)hub_icon_x + 30) { show_aegis_hub = !show_aegis_hub; icon_hits[3]++; click_lock = 15; }
                if (mouse_x >= (int32_t)term_icon_x && mouse_x <= (int32_t)term_icon_x + 30) { show_terminal = !show_terminal; icon_hits[4]++; click_lock = 15; }
                if (mouse_x >= (int32_t)ai_icon_x && mouse_x <= (int32_t)ai_icon_x + 30) { show_elysia = !show_elysia; icon_hits[5]++; click_lock = 15; }
                if (mouse_x >= (int32_t)mesh_icon_x && mouse_x <= (int32_t)mesh_icon_x + 30) { show_mesh = !show_mesh; icon_hits[6]++; click_lock = 15; }
                if (mouse_x >= (int32_t)sw_icon_x && mouse_x <= (int32_t)sw_icon_x + 30) { show_orchestrator = 0; show_explorer = 0; window_visible[7] = !window_visible[7]; click_lock = 15; }
                if (mouse_x >= (int32_t)cloak_icon_x && mouse_x <= (int32_t)cloak_icon_x + 30) { cloaked_mode = !cloaked_mode; click_lock = 15; }
                if (mouse_x >= (int32_t)silence_icon_x && mouse_x <= (int32_t)silence_icon_x + 30) { silence_mode = !silence_mode; click_lock = 15; }
                if (mouse_x >= (int32_t)exit_icon_x && mouse_x <= (int32_t)exit_icon_x + 30) { current_state = STATE_LOGIN; click_lock = 15; }
            }
        } else {
            click_lock--;
        }
    }

    window_visible[0] = show_explorer;
    window_visible[1] = show_system;
    window_visible[2] = show_orchestrator;
    window_visible[3] = show_aegis_hub;
    window_visible[4] = show_terminal;
    window_visible[5] = show_elysia;
    window_visible[6] = show_mesh;

    // Draw stylish glowing dock icons
    uint32_t icons_pos_x[] = {exp_icon_x, sys_icon_x, orch_icon_x, hub_icon_x, term_icon_x, ai_icon_x, mesh_icon_x, sw_icon_x, cloak_icon_x, silence_icon_x, evo_icon_x, exit_icon_x};
    uint32_t icons_active[] = {show_explorer, show_system, show_orchestrator, show_aegis_hub, show_terminal, show_elysia, show_mesh, window_visible[7], cloaked_mode, silence_mode, 1, 0};
    uint32_t icons_color[] = {0x00AAFF, 0xFFAA00, 0x00FFFF, 0x00FF00, 0xFFFFFF, 0xFFFFFF, 0x33FF33, 0xFF00FF, 0x8800FF, 0x111111, 0xFF00FF, 0xFF0000};
    const char* icon_labels[] = {"EX", "SY", "OR", "HB", "TR", "EL", "MH", "SW", "CK", "SL", "EV", "QT"};

    for (int i = 0; i < 12; i++) {
        if (i == 2) continue; // Skip orch icon slot visual
        uint32_t base_color = icons_color[i];
        if (!icons_active[i]) {
            base_color = (base_color & 0xFEFEFE) >> 1; // Dim
            draw_rounded_rect_alpha(backbuffer, icons_pos_x[i], dock_y + 13, 30, 30, base_color, 120);
        } else {
            // Active glow
            draw_rounded_rect_alpha(backbuffer, icons_pos_x[i]-2, dock_y + 11, 34, 34, base_color, 100);
            draw_rounded_rect_alpha(backbuffer, icons_pos_x[i], dock_y + 13, 30, 30, base_color, 255);
        }
        kprint_to(backbuffer, icons_pos_x[i] + 5, dock_y + 18, icon_labels[i], 0xFFFFFF);
    }

    // Predictive Glow
    for (int i=0; i<8; i++) {
        if (icon_hits[i] > 3 && i != 2) {
             draw_rounded_rect_alpha(backbuffer, icons_pos_x[i]-4, dock_y+9, 38, 38, 0xFFFF00, 80); 
        }
    }

    // PAC-S Pointer Pulse
    static int pac_pulse = 0;
    static int32_t pac_x = 0, pac_y = 0;
    if (mouse_left) {
        pac_pulse = 20; pac_x = mouse_x; pac_y = mouse_y;
    }
    if (pac_pulse > 0) {
        draw_rounded_rect_alpha(backbuffer, pac_x - (25-pac_pulse), pac_y - (25-pac_pulse), 50-pac_pulse*2, 50-pac_pulse*2, 0x00FFFF, pac_pulse * 10);
        pac_pulse--;
    }
    
    // 3. High-Efficiency Glassmorphic Window Dispatcher
    if (mouse_left) {
        static int prev_mouse_left = 0;
        if (!prev_mouse_left) {
            drag_target = -1;
            for (int i = 7; i >= 0; i--) { 
                if (!window_visible[i]) continue;
                Window* win = windows[i];
                
                int hpx, hpy; float hscale;
                project_hologram(win->x, win->y, win->z, &hpx, &hpy, &hscale);
                uint32_t hdw = (uint32_t)((float)win->w * hscale);
                uint32_t hdh = (uint32_t)(30.0f * hscale); 

                if (mouse_x >= hpx && mouse_x <= (int32_t)(hpx + hdw) &&
                    mouse_y >= hpy && mouse_y <= (int32_t)(hpy + hdh)) { 
                    drag_target = i;
                    drag_off_x = mouse_x - win->x;
                    drag_off_y = mouse_y - win->y;
                    
                    Window* temp_win = windows[i];
                    int temp_vis = window_visible[i];
                    for (int j = i; j < 7; j++) {
                        windows[j] = windows[j+1];
                        window_visible[j] = window_visible[j+1];
                    }
                    windows[7] = temp_win;
                    window_visible[7] = temp_vis;
                    drag_target = 7;
                    
                    synaptic_graph[drag_target].relevance = 100;
                    break;
                }
            }
        }
        prev_mouse_left = 1;
        
        if (drag_target != -1) {
            windows[drag_target]->x = mouse_x - drag_off_x;
            windows[drag_target]->y = mouse_y - drag_off_y;
        }
    } else {
        drag_target = -1;
    }

    if (silence_mode) {
         for (uint32_t y = 0; y < g_fb.height; y++) {
            for (uint32_t x = 0; x < g_fb.width; x++) {
                Window* top = windows[7];
                if (window_visible[7] && 
                    x >= (uint32_t)top->x && x <= (uint32_t)(top->x + top->w) &&
                    y >= (uint32_t)top->y && y <= (uint32_t)(top->y + top->h)) {
                    continue; 
                }
                draw_pixel_alpha(backbuffer, x, y, 0x000000, 150); 
            }
        }
    }

    // Render Windows (Back to front)
    for (int i = 0; i < 8; i++) {
        if (!window_visible[i]) continue;
        Window* win = windows[i];
        
        int win_px, win_py;
        float scale;
        project_hologram(win->x, win->y, win->z, &win_px, &win_py, &scale);
        uint32_t dw = (uint32_t)((float)win->w * scale);
        uint32_t dh = (uint32_t)((float)win->h * scale);

        // Synaptic Context Glow
        int32_t glow_alpha = (synaptic_graph[i].relevance * 2);
        if (glow_alpha > 120) glow_alpha = 120;
        if (glow_alpha > 0) {
            draw_rounded_rect_alpha(backbuffer, win_px-6, win_py-6, dw+12, dh+12, win->color, (uint8_t)glow_alpha);
        }

        // Hover Lift
        if (mouse_x >= win->x && mouse_x <= win->x + (int32_t)win->w &&
            mouse_y >= win->y && mouse_y <= win->y + (int32_t)win->h) {
            if (win->z > -50) win->z -= 2; 
        } else {
            if (win->z < 0) win->z += 2; 
        }

        int32_t ox = 0, oy = 0;
        if (phasing_mode) {
             ox = (int32_t)((float)((frame_count % 3) - 1) * scale);
             oy = (int32_t)((float)((frame_count % 2) - 1) * scale);
        }

        if (win == &elysia_window) {
            draw_refocuser_wings(backbuffer, win_px + ox, win_py + oy, dw, dh);
        }

        // Beautiful Glassmorphic Window Frame
        // Title Bar
        draw_rounded_rect_alpha(backbuffer, win_px + ox, win_py + oy, dw, (uint32_t)(30.0f * scale), 0x050510, 230);
        // Alpha Glass Body
        draw_rounded_rect_alpha(backbuffer, win_px + ox, win_py + oy + (uint32_t)(30.0f * scale), dw, dh - (uint32_t)(30.0f * scale), 0x050515, win->alpha - 30);
        // Cyber Border
        draw_rounded_rect_alpha(backbuffer, win_px + ox, win_py + oy, dw, dh, win->color, 120);
        
        kprint_to(backbuffer, win_px + ox + 10, win_py + oy + 10, win->title, 0x00FFFF);
        
        if (win == &system_window) {
            kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 60, "KERNEL: MASTER", 0x00FFFF);
            kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 90, is_guest_mode ? "SEC: UNVERIFIED" : "SEC: BONDED", is_guest_mode ? 0xFF0000 : 0x00FF00);
            kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 115, "RUST_CORE: ACTIVE", 0xFFAA00);
            kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 140, "INTEGRITY:", 0xFFFFFF);
            char integ_str[16] = "100% [SSV_S]";
            if (system_integrity < 100) { integ_str[0] = '0' + (system_integrity/10); integ_str[1] = '0' + (system_integrity%10); integ_str[2] = '%'; }
            kprint_to(backbuffer, win_px + ox + 120, win_py + oy + 130, integ_str, system_integrity < 100 ? 0xFF0000 : 0x00FFFF);
        } else if (win == &explorer_window) {
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 60, "FILES ON DISK:", 0x00FFFF);
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 90, file_list, 0xAAAAAA);
        } else if (win == &aegis_hub_window) {
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 60, "LEDGER PREVIEW:", 0x00FFFF);
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 90, ledger_data, 0xAAAAAA);
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 300, "SECURITY LAYERS:", 0x00FF00);
             const char* layers[] = {"L1-WHITE", "L4-BLACKWALL", "L6-SENTINEL", "L8-SHADOW"};
             for(int l=0; l<4; l++) {
                 kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 330 + (l*20), layers[l], 0x00FFFF);
             }
        } else if (win == &terminal_window) {
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 60, "ROOT@ELYSIOS:> ", 0x00FF00);
             kprint_to(backbuffer, win_px + ox + 140, win_py + oy + 60, keyboard_buffer, 0xFFFFFF);
        } else if (win == &elysia_window) {
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 60, "ELYSIA:> ", 0x00FFFF);
             kprint_to(backbuffer, win_px + ox + 20, win_py + oy + 100, elysia_reply, 0xFFFFFF);
             kprint_to(backbuffer, win->x + 20, win->y + 200, "COGNITIVE CORE: STABLE", 0x00FF00);
        } else if (win == &mesh_window) {
            static int drag_node = -1;
            for (int j = 0; j < 25; j++) {
                int nx_p, ny_p; float ns;
                project_hologram(ghost_nodes[j].x, ghost_nodes[j].y, 10, &nx_p, &ny_p, &ns);
                uint32_t nx = win_px + ox + nx_p;
                uint32_t ny = win_py + oy + ny_p;
                
                if (j % 5 < 4) {
                    int nxe_p, nye_p; float nse;
                    project_hologram(ghost_nodes[j+1].x, ghost_nodes[j+1].y, 10, &nxe_p, &nye_p, &nse);
                    draw_line_alpha(backbuffer, nx + 5, ny + 5, win_px + ox + nxe_p + 5, win_py + oy + nye_p + 5, 0x00FFFF, 40);
                }
                if (j < 20) {
                    int nxe_p, nye_p; float nse;
                    project_hologram(ghost_nodes[j+5].x, ghost_nodes[j+5].y, 10, &nxe_p, &nye_p, &nse);
                    draw_line_alpha(backbuffer, nx + 5, ny + 5, win_px + ox + nxe_p + 5, win_py + oy + nye_p + 5, 0x00FFFF, 40);
                }

                if (frame_count % 120 < 40) {
                    draw_line_alpha(backbuffer, nx + 5, ny + 5, g_fb.width/2, g_fb.height/2, 0xFF00FF, 60);
                }

                uint8_t alpha = 100 + ghost_nodes[j].energy;
                draw_rounded_rect_alpha(backbuffer, nx, ny, (uint32_t)(10.0f * ns), (uint32_t)(10.0f * ns), ghost_nodes[j].color, alpha);
                
                if (mouse_left && mouse_x >= (int32_t)nx && mouse_x <= (int32_t)nx + 10 &&
                    mouse_y >= (int32_t)ny && mouse_y <= (int32_t)ny + 10) {
                    drag_node = j;
                }
            }
            if (!mouse_left) drag_node = -1;
            if (drag_node != -1) {
                ghost_nodes[drag_node].x = mouse_x - win->x - 5;
                ghost_nodes[drag_node].y = mouse_y - win->y - 5;
            }

            uint32_t hud_y = win_py + oy + 40;
            kprint_to(backbuffer, win_px + ox + 10, hud_y,      "FLEET STATUS: DISTRIBUTED", 0x00FFFF);
            kprint_to(backbuffer, win_px + ox + 10, hud_y + 20, "ACTIVE NODES: 8", 0x00FF00);
        }
    }

    draw_infinity_gauntlet(backbuffer);

    if (snap_flash > 0) {
        draw_rect_to(backbuffer, 0, 0, g_fb.width, g_fb.height, 0xFFFFFF); 
        snap_flash--;
    }

    // Sovereign Notifications
    if (note_timer > 0) {
        note_timer--;
        int slide_x = g_fb.width - 240;
        if(note_timer > 160) slide_x += (note_timer - 160) * 10;
        if(note_timer < 20) slide_x += (20 - note_timer) * 10;
        
        draw_rounded_rect_alpha(backbuffer, slide_x, 40, 220, 50, 0x050515, 200);
        draw_rounded_rect_alpha(backbuffer, slide_x-2, 38, 224, 54, 0x00FFFF, 80);
        kprint_to(backbuffer, slide_x + 15, 55, note_msg, 0x00FFFF);
    }

    // Crosshair Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    
    draw_rect_to(backbuffer, mouse_x - 5, mouse_y, 11, 2, 0x00FFFF);
    draw_rect_to(backbuffer, mouse_x, mouse_y - 5, 2, 11, 0x00FFFF);
    draw_rect_to(backbuffer, mouse_x - 1, mouse_y - 1, 3, 3, 0xFFFFFF);

    swap_buffers();
}

void refresh_ui() {
    update_synaptic_context();
    if (current_state == STATE_LOGIN) {
        render_login_screen();
    } else if (current_state == STATE_BOOTING) {
        render_boot_sequence();
    } else {
        render_desktop();
    }
}
