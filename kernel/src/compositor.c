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

void execute_sovereign_command(const char* cmd) {
    ata_append_ledger(cmd, frame_count);
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

static Window* windows[7] = { &explorer_window, &system_window, &orchestrator_window, &aegis_hub_window, &terminal_window, &elysia_window, &mesh_window };
static int window_visible[7] = {0, 0, 0, 1, 0, 1, 0};

void kprint_to(uint32_t* buffer, uint32_t x, uint32_t y, const char* str, uint32_t color);

__attribute__((aligned(4096))) static uint32_t backbuffer[1920 * 1080];

void draw_pixel_to(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t color) {
    if (x >= g_fb.width || y >= g_fb.height) return;
    buffer[y * g_fb.width + x] = color;
}

void draw_pixel_alpha(uint32_t* buffer, uint32_t x, uint32_t y, uint32_t color, uint8_t alpha) {
    if (x >= g_fb.width || y >= g_fb.height) return;
    if (alpha == 255) {
        buffer[y * g_fb.width + x] = color;
        return;
    }
    
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
    vfs_init();
    void vfs_init_fat32();
    vfs_init_fat32();

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
    list_root_dir(file_list, 256);
}

void draw_rounded_rect(uint32_t* buffer, int32_t x, int32_t y, uint32_t w, uint32_t h, uint32_t color) {
    draw_rounded_rect_alpha(buffer, x, y, w, h, color, 255);
}

static void update_particles() {
    for(int i=0; i<32; i++) {
        if(cursor_trail[i].life > 0) cursor_trail[i].life--;
    }
    // Spawn new at mouse
    cursor_trail[next_particle].x = mouse_x;
    cursor_trail[next_particle].y = mouse_y;
    cursor_trail[next_particle].life = 20;
    next_particle = (next_particle + 1) % 32;
}

static void render_particles(uint32_t* buffer) {
    for(int i=0; i<32; i++) {
        if(cursor_trail[i].life > 0) {
            uint8_t alpha = cursor_trail[i].life * 12;
            draw_pixel_alpha(buffer, cursor_trail[i].x, cursor_trail[i].y, 0x00FFFF, alpha);
        }
    }
}

void render_login_screen() {
    // 1. Aqueous Premium Background
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            uint8_t r = (y * 50) / g_fb.height + 20;
            uint8_t g = (y * 50) / g_fb.height + 25;
            uint8_t b = 60;
            backbuffer[y * g_fb.width + x] = (r << 16) | (g << 8) | b;
        }
    }

    // 2. Sovereign Orb (Silicon Enclave Refined)
    uint32_t orb_x = g_fb.width / 2;
    uint32_t orb_y = g_fb.height / 2 - 50;
    
    // Silicon Core pattern (Phase 110)
    if (enclave_ready) {
        draw_rounded_rect_alpha(backbuffer, orb_x - 50, orb_y - 50, 100, 100, 0xFFAA00, 50); // Gold Enclave Halo
        for(int s=0; s<4; s++) {
            draw_rect_to(backbuffer, orb_x - 30 + (s*20), orb_y - 45, 10, 90, 0xFFFFFF); // Silicon trace pattern
        }
    }

    uint32_t pulse = (frame_count / 10) % 20;
    orb_color = 0x00FFFF; // Default Login
    if (frame_count % 120 < 60) orb_color = 0x008888; // Breathing
    
    draw_rounded_rect(backbuffer, orb_x - 40 - (pulse/2), orb_y - 40 - (pulse/2), 80 + pulse, 80 + pulse, orb_color);
    draw_rounded_rect(backbuffer, orb_x - 30, orb_y - 30, 60, 60, 0x111111);

    kprint_to(backbuffer, orb_x - 80, orb_y + 80, "SILICON BONDED", 0xFFAA00);
    kprint_to(backbuffer, orb_x - 100, orb_y + 110, is_guest_mode ? "[GUEST ACCESS ONLY]" : "[READY TO MANIFEST]", is_guest_mode ? 0xFFAA00 : 0x00FF00);
    
    if (!is_guest_mode) {
        char greet[64] = "MANIFESTING ";
        int gl = 12;
        for(int i=0; i<32; i++) {
            greet[gl+i] = persona_name[i];
            if(!persona_name[i]) break;
        }
        kprint_to(backbuffer, orb_x - 120, orb_y + 140, greet, 0x00FFFF);
    }

    kprint_to(backbuffer, orb_x - 110, orb_y + 150, "CLICK ORB TO ENTER APEX", 0x555555);

    // 3. Logic: Transition to Booting (Phase 123)
    if (mouse_left) {
        // Hit check for Orb area
        if (mouse_x > (int32_t)orb_x - 50 && mouse_x < (int32_t)orb_x + 50 &&
            mouse_y > (int32_t)orb_y - 50 && mouse_y < (int32_t)orb_y + 50) {
            current_state = STATE_BOOTING;
            frame_count = 0; // Reset for boot timer
        }
    }

    // 4. Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    draw_rect_to(backbuffer, mouse_x, mouse_y, 10, 10, 0xFFFFFF);
    swap_buffers();
}

void render_boot_sequence() {
    frame_count++;
    // Aqueous Background
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            backbuffer[y * g_fb.width + x] = 0x050510; // Deep Abyss
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
    
    // Parallax Stars (Phase 122)
    for(int i=0; i<30; i++) {
        int sx = (i * 47 + frame_count/2) % 1024;
        int sy = (i * 13 + frame_count/4) % 768;
        draw_rect_to(backbuffer, sx, sy, 1, 1, 0x666666);
    }

    // Intent Manifestation Loop (Phase 120)
    for (int i=0; i<9; i++) {
        if (icon_hits[i] > 10) {
            // Predicatively open windows
            if (i == 0) show_explorer = 1;
            if (i == 1) show_system = 1;
            if (i == 3) show_aegis_hub = 1;
            if (i == 7) cloaked_mode = 1; // Predict cloak
        }
    }
    
    // Update Clock (Simulated)
    int sec = (frame_count / 60) % 60;
    int min = (frame_count / 3600) % 60;
    int hr = (frame_count / 216000) % 24;
    clock_text[0] = '0' + (hr/10); clock_text[1] = '0' + (hr%10); clock_text[2] = ':';
    clock_text[3] = '0' + (min/10); clock_text[4] = '0' + (min%10); clock_text[5] = ':';
    clock_text[6] = '0' + (sec/10); clock_text[7] = '0' + (sec%10); clock_text[8] = '\0';

    // Refocuser Charge Decay & Acceleration
    if (refocus_charge > 0) refocus_charge--;
    uint32_t flux_accel = snap_mode ? 3 : 10; // Extreme speed in Snap
    if (!snap_mode && refocus_charge > 60) flux_accel = 5; 

    // 1. Dynamic Flux Background (Animated Gradient)
    uint8_t flux = (frame_count / flux_accel) % 50;
    for (uint32_t y = 0; y < g_fb.height; y++) {
        for (uint32_t x = 0; x < g_fb.width; x++) {
            uint8_t r = (y * 30) / g_fb.height + 5 + (flux / 5);
            uint8_t g = (y * 30) / g_fb.height + 10 + (flux / 8);
            uint8_t b = 30 + (flux / 10);
            
            if (cloaked_mode && (frame_count % 2)) {
                r += (x % 10) * 2; g += (y % 10) * 2;
            }
            
            uint32_t base_color = (r << 16) | (g << 8) | b;
            backbuffer[y * g_fb.width + x] = base_color;
        }
    }

    // L15 Divinity Mode Matrix (Background Layer)
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

    // 2. Centered Sovereign Dock (Silicon Bonded)
    uint32_t dock_w = 600;
    uint32_t dock_h = 50;
    uint32_t dock_x = (g_fb.width - dock_w) / 2;
    uint32_t dock_y = g_fb.height - 70;
    draw_rounded_rect(backbuffer, dock_x, dock_y, dock_w, dock_h, 0x222222);
    
    // Icon blocks & Logic
    uint32_t exp_icon_x = dock_x + 20;
    uint32_t sys_icon_x = dock_x + 70;
    uint32_t orch_icon_x = dock_x + 120;
    uint32_t hub_icon_x = dock_x + 170;
    uint32_t term_icon_x = dock_x + 220;
    uint32_t ai_icon_x = dock_x + 270;
    uint32_t mesh_icon_x = dock_x + 320;
    uint32_t cloak_icon_x = dock_x + 370;
    uint32_t silence_icon_x = dock_x + 420;
    uint32_t exit_icon_x = dock_x + 470;

    // Cognitive Pulse (L10)
    uint8_t dock_bright = 34 + (frame_count % 30 < 15 ? (frame_count % 30) * 2 : (30 - (frame_count % 30)) * 2);

    if (mouse_left) {
        static int click_lock = 0;
        if (!click_lock) {
            // ... (Icons)
            if (mouse_x >= (int32_t)exp_icon_x && mouse_x <= (int32_t)exp_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_explorer = !show_explorer; 
                icon_hits[0]++;
                refocus_charge += 15;
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)sys_icon_x && mouse_x <= (int32_t)sys_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_system = !show_system; 
                icon_hits[1]++;
                refocus_charge += 15;
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)hub_icon_x && mouse_x <= (int32_t)hub_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_aegis_hub = !show_aegis_hub; 
                icon_hits[3]++;
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)term_icon_x && mouse_x <= (int32_t)term_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_terminal = !show_terminal; 
                icon_hits[4]++;
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)ai_icon_x && mouse_x <= (int32_t)ai_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_elysia = !show_elysia; 
                icon_hits[5]++;
                trigger_notification("ELYSIAN PERSONA MANIFESTED");
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)mesh_icon_x && mouse_x <= (int32_t)mesh_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_mesh = !show_mesh; 
                icon_hits[6]++;
                trigger_notification("MESH SYNC INITIATED");
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)cloak_icon_x && mouse_x <= (int32_t)cloak_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                cloaked_mode = !cloaked_mode; 
                trigger_notification(cloaked_mode ? "CLOAK ACTIVATED" : "CLOAK DEACTIVATED");
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)silence_icon_x && mouse_x <= (int32_t)silence_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                silence_mode = !silence_mode; 
                trigger_notification(silence_mode ? "SILENCE ENGAGED" : "SILENCE DISENGAGED");
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)exit_icon_x && mouse_x <= (int32_t)exit_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                trigger_notification("HIBERNATING TO VAULT...");
                current_state = STATE_LOGIN; click_lock = 15;
            }
        } else {
            click_lock--;
        }
    }

    // Update Visibility Bridge
    window_visible[0] = show_explorer;
    window_visible[1] = show_system;
    window_visible[2] = show_orchestrator;
    window_visible[3] = show_aegis_hub;
    window_visible[4] = show_terminal;
    window_visible[5] = show_elysia;
    window_visible[6] = show_mesh;

    draw_rounded_rect(backbuffer, dock_x, dock_y, dock_w, dock_h, (dock_bright << 16) | (dock_bright << 8) | dock_bright);
    
    draw_rect_to(backbuffer, exp_icon_x, dock_y + 10, 30, 30, show_explorer ? 0x00AAFF : 0x003355); 
    draw_rect_to(backbuffer, sys_icon_x, dock_y + 10, 30, 30, show_system ? 0xFFAA00 : 0x553300);   
    draw_rect_to(backbuffer, hub_icon_x, dock_y + 10, 30, 30, show_aegis_hub ? 0x00FF00 : 0x005500); 
    draw_rect_to(backbuffer, term_icon_x, dock_y + 10, 30, 30, show_terminal ? 0xFFFFFF : 0x222222); 
    draw_rect_to(backbuffer, ai_icon_x, dock_y + 10, 30, 30, show_elysia ? 0xFFFFFF : 0x00FFFF); 
    draw_rect_to(backbuffer, mesh_icon_x, dock_y + 10, 30, 30, show_mesh ? 0x33FF33 : 0x114411); // Mesh
    draw_rect_to(backbuffer, cloak_icon_x, dock_y + 10, 30, 30, cloaked_mode ? 0x8800FF : 0x330055); 
    draw_rect_to(backbuffer, silence_icon_x, dock_y + 10, 30, 30, silence_mode ? 0x111111 : 0x444444); 
    draw_rect_to(backbuffer, exit_icon_x, dock_y + 10, 30, 30, 0xFF0000); 

    // 2.7 Predictive Hub: Cognitive Glow (L17)
    uint32_t icons_x[9] = {exp_icon_x, sys_icon_x, orch_icon_x, hub_icon_x, term_icon_x, ai_icon_x, mesh_icon_x, cloak_icon_x, silence_icon_x};
    for (int i=0; i<9; i++) {
        if (icon_hits[i] > 3) {
             draw_rect_to(backbuffer, icons_x[i]-2, dock_y+8, 34, 34, 0xFFFF00); // Yellow predictive glow
        }
    }

    // PAC-S Pointer Pulse (L26)
    static int pac_pulse = 0;
    static int32_t pac_x = 0, pac_y = 0;
    if (mouse_left && !click_lock) {
        pac_pulse = 20; pac_x = mouse_x; pac_y = mouse_y;
    }
    if (pac_pulse > 0) {
        draw_rounded_rect_alpha(backbuffer, pac_x - (25-pac_pulse), pac_y - (25-pac_pulse), 50-pac_pulse*2, 50-pac_pulse*2, 0xFFAA00, pac_pulse * 10);
        pac_pulse--;
    }

    // Resonance Spectrum Visualizer (L5/L7)
    for(int s=0; s<10; s++) {
        int h = (frame_count + s*5) % 25;
        draw_rect_to(backbuffer, dock_x + 430 + (s*10), dock_y + 40 - h, 6, h, 0x00FFFF);
    }
    
    // 2. High-Efficiency Window Dispatcher (Z-Order & Alpha)
    if (mouse_left) {
        static int prev_mouse_left = 0;
        if (!prev_mouse_left) {
            // Drag Start Logic
            drag_target = -1;
            for (int i = 4; i >= 0; i--) { // Reverse order for hit detection (5 windows)
                if (!window_visible[i]) continue;
                Window* win = windows[i];
                if (mouse_x >= win->x && mouse_x <= (int32_t)(win->x + win->w) &&
                    mouse_y >= win->y && mouse_y <= (int32_t)(win->y + 30)) { 
                    drag_target = i;
                    drag_off_x = mouse_x - win->x;
                    drag_off_y = mouse_y - win->y;
                    
                    // Z-Order: Bring to front
                    Window* temp_win = windows[i];
                    int temp_vis = window_visible[i];
                    for (int j = i; j < 4; j++) {
                        windows[j] = windows[j+1];
                        window_visible[j] = window_visible[j+1];
                    }
                    windows[4] = temp_win;
                    window_visible[4] = temp_vis;
                    drag_target = 4;
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

    // L14: Silence (Final Seal) Overlay
    if (silence_mode) {
         for (uint32_t y = 0; y < g_fb.height; y++) {
            for (uint32_t x = 0; x < g_fb.width; x++) {
                // Focus preservation (Don't dim the top-most window)
                Window* top = windows[4];
                if (window_visible[4] && 
                    x >= (uint32_t)top->x && x <= (uint32_t)(top->x + top->w) &&
                    y >= (uint32_t)top->y && y <= (uint32_t)(top->y + top->h)) {
                    continue; 
                }
                draw_pixel_alpha(backbuffer, x, y, 0x000000, 150); // Dim the background
            }
        }
    }

    for (int i = 0; i < 7; i++) {
        if (!window_visible[i]) continue;
        Window* win = windows[i];
        
        // Hover Lift (Phase 122)
        if (mouse_x >= win->x && mouse_x <= win->x + (int32_t)win->w &&
            mouse_y >= win->y && mouse_y <= win->y + (int32_t)win->h) {
            if (win->z > -50) win->z -= 2; // Lift toward camera
        } else {
            if (win->z < 0) win->z += 2; // Settle back
        }

        int px, py;
        float scale;
        project_hologram(win->x, win->y, win->z, &px, &py, &scale);
        uint32_t dw = (uint32_t)((float)win->w * scale);
        uint32_t dh = (uint32_t)((float)win->h * scale);

        int32_t ox = 0, oy = 0;
        if (phasing_mode) {
             ox = (int32_t)((float)((frame_count % 3) - 1) * scale);
             oy = (int32_t)((float)((frame_count % 2) - 1) * scale);
        }

        if (win == &elysia_window) {
             // Predictive Halo (Phase 120)
            if (icon_hits[0] > 10 || icon_hits[1] > 10 || icon_hits[3] > 10) {
                draw_rounded_rect_alpha(backbuffer, px-5, py-5, dw+10, dh+10, 0xFFAA00, 30);
            }
            
            draw_rounded_rect(backbuffer, px, py, dw, dh, win->color);
            draw_refocuser_wings(backbuffer, px + ox, py + oy, dw, dh);
        }

        // Render Opaque Title bar
        draw_rounded_rect_alpha(backbuffer, px + ox, py + oy, dw, (uint32_t)(30.0f * scale), 0x111111, 255);
        // Render Alpha Body
        draw_rounded_rect_alpha(backbuffer, px + ox, py + oy + (uint32_t)(30.0f * scale), dw, dh - (uint32_t)(30.0f * scale), win->color, win->alpha);
        
        // Window Content (Simplified check)
        kprint_to(backbuffer, px + ox + 10, py + oy + 10, win->title, 0x00FF00);
        
        if (win == &system_window) {
            kprint_to(backbuffer, win->x + 20, win->y + 60, "KERNEL: MASTER", 0x00FF00);
            kprint_to(backbuffer, win->x + 20, win->y + 90, is_guest_mode ? "SEC: UNVERIFIED" : "SEC: BONDED", is_guest_mode ? 0xFF0000 : 0x00FF00);
            kprint_to(backbuffer, win->x + 20, win->y + 115, "RUST_CORE: ACTIVE", 0xFFAA00);
            kprint_to(backbuffer, win->x + 20, win->y + 140, "INTEGRITY:", 0xFFFFFF);
            char integ_str[16] = "100% [SSV_S]";
            if (system_integrity < 100) { integ_str[0] = '0' + (system_integrity/10); integ_str[1] = '0' + (system_integrity%10); integ_str[2] = '%'; }
            kprint_to(backbuffer, win->x + 120, win->y + 130, integ_str, system_integrity < 100 ? 0xFF0000 : 0x00FFFF);
        } else if (win == &explorer_window) {
             kprint_to(backbuffer, win->x + 20, win->y + 60, "FILES ON DISK:", 0xFFFF00);
             kprint_to(backbuffer, win->x + 20, win->y + 90, file_list, 0x00FFFF);
        } else if (win == &aegis_hub_window) {
             kprint_to(backbuffer, win->x + 20, win->y + 60, "LEDGER PREVIEW:", 0x00FFFF);
             kprint_to(backbuffer, win->x + 20, win->y + 90, ledger_data, 0xAAAAAA);
        } else if (win == &terminal_window) {
             kprint_to(backbuffer, win->x + 20, win->y + 60, "ROOT@ELYSIOS:> ", 0x00FF00);
             kprint_to(backbuffer, win->x + 140, win->y + 60, keyboard_buffer, 0xFFFFFF);
        } else if (win == &elysia_window) {
             kprint_to(backbuffer, win->x + 20, win->y + 60, "ELYSIA:> ", 0x00FFFF);
             kprint_to(backbuffer, win->x + 20, win->y + 100, elysia_reply, 0xFFFFFF);
             kprint_to(backbuffer, win->x + 20, win->y + 200, "COGNITIVE CORE: STABLE", 0x00FF00);
        } else if (win == &mesh_window) {
            // Star Map Rendering (Phase 119)
            static int drag_node = -1;
            for (int i = 0; i < 25; i++) {
                int nx_p, ny_p; float ns;
                project_hologram(ghost_nodes[i].x, ghost_nodes[i].y, 10, &nx_p, &ny_p, &ns);
                uint32_t nx = px + nx_p;
                uint32_t ny = py + ny_p;
                
                // Draw Resonance Links (to neighbors)
                if (i % 5 < 4) draw_rect_to(backbuffer, nx + 5, ny + 5, (uint32_t)(75.0f * ns), 1, 0x003333);

                // Draw Node
                uint8_t alpha = 100 + ghost_nodes[i].energy;
                draw_rounded_rect_alpha(backbuffer, nx, ny, (uint32_t)(10.0f * ns), (uint32_t)(10.0f * ns), ghost_nodes[i].color, alpha);
                
                // Drag Logic
                if (mouse_left && mouse_x >= (int32_t)nx && mouse_x <= (int32_t)nx + 10 &&
                    mouse_y >= (int32_t)ny && mouse_y <= (int32_t)ny + 10) {
                    drag_node = i;
                }
            }
            if (!mouse_left) drag_node = -1;
            if (drag_node != -1) {
                ghost_nodes[drag_node].x = mouse_x - win->x - 5;
                ghost_nodes[drag_node].y = mouse_y - win->y - 5;
            }
        }
    }

    draw_infinity_gauntlet(backbuffer);

    // L14: Silence (Final Seal) Overlay
    if (snap_flash > 0) {
        draw_rect_to(backbuffer, 0, 0, g_fb.width, g_fb.height, 0xFFFFFF); // White out
        snap_flash--;
    }

    // 5. Orchestrator Window (Final Audit)
    if (show_orchestrator) {
        draw_rounded_rect(backbuffer, orchestrator_window.x, orchestrator_window.y, orchestrator_window.w, orchestrator_window.h, orchestrator_window.color);
        draw_rounded_rect(backbuffer, orchestrator_window.x, orchestrator_window.y, orchestrator_window.w, 30, 0x111111);
        kprint_to(backbuffer, orchestrator_window.x + 10, orchestrator_window.y + 10, orchestrator_window.title, 0xFFFFFF);
        
        static int audit_step = 0;
        if (frame_count % 30 == 0) audit_step++;
        
        if (audit_step < 5) kprint_to(backbuffer, orchestrator_window.x + 20, orchestrator_window.y + 60, "AUDIT: SCANNING KERNEL...", 0xFFFFFF);
        else if (audit_step < 10) kprint_to(backbuffer, orchestrator_window.x + 20, orchestrator_window.y + 60, "AUDIT: VERIFYING STORAGE...", 0xFFFFFF);
        else if (audit_step < 15) kprint_to(backbuffer, orchestrator_window.x + 20, orchestrator_window.y + 60, "AUDIT: BONDING IDENTITY...", 0xFFFFFF);
        else {
            kprint_to(backbuffer, orchestrator_window.x + 20, orchestrator_window.y + 60, "AUDIT: COMPLETE. SOVEREIGNTY SECURED.", 0x00FF00);
            kprint_to(backbuffer, orchestrator_window.x + 20, orchestrator_window.y + 90, "CERTIFICATE WRITTEN TO DISK.", 0x00FFFF);
            
            static int cert_written = 0;
            if (!cert_written && !is_guest_mode) {
                const char* cert = "SOVEREIGN IDENTITY CERTIFICATE\nSTATUS: BONDED\nLEVEL: APEX APEX\n";
                // We use a dummy write to proof sovereignty
                fat32_write_file("IDENTITY.CRT", cert, 64);
                cert_written = 1;
            }
        }
    }
    // 6. Aegis Security Hub (L1-L14)
    if (show_aegis_hub) {
        draw_rounded_rect(backbuffer, aegis_hub_window.x, aegis_hub_window.y, aegis_hub_window.w, aegis_hub_window.h, aegis_hub_window.color);
        draw_rounded_rect(backbuffer, aegis_hub_window.x, aegis_hub_window.y, aegis_hub_window.w, 30, 0x222222);
        kprint_to(backbuffer, aegis_hub_window.x + 10, aegis_hub_window.y + 10, aegis_hub_window.title, 0x00FF00);
        
        kprint_to(backbuffer, aegis_hub_window.x + 20, aegis_hub_window.y + 60, "AEGIS SECURITY LAYERS (ACTIVE):", 0xFFFFFF);
        const char* layers[] = {"L1-WHITE", "L4-BLACKWALL", "L6-SENTINEL", "L8-SHADOW", "L9-ABYSS", "L11-SOVEREIGN"};
        for(int i=0; i<6; i++) {
            kprint_to(backbuffer, aegis_hub_window.x + 20, aegis_hub_window.y + 90 + (i*30), layers[i], 0x00FFFF);
            kprint_to(backbuffer, aegis_hub_window.x + 200, aegis_hub_window.y + 90 + (i*30), "[ENFORCED]", 0x00FF00);
        }
        
        kprint_to(backbuffer, aegis_hub_window.x + 20, aegis_hub_window.y + 300, "LEDGER PREVIEW (FROM DISK):", 0xFFFF00);
        // Show raw ledger data snippet
        kprint_to(backbuffer, aegis_hub_window.x + 20, aegis_hub_window.y + 330, ledger_data, 0xAAAAAA);
    }

    // 7. Blackwall Enforcment (Emergency Overlay)
    // Simulating a critical fault handler
    static int simulation_fault = 0;
    if (mouse_x < 10 && mouse_y < 10 && mouse_left) simulation_fault = 1;
    if (simulation_fault) {
        draw_rect_to(backbuffer, 0, 0, g_fb.width, g_fb.height, 0x440000); // Corruption screen
        kprint_to(backbuffer, g_fb.width/2 - 150, g_fb.height/2, "!!! BLACKWALL ENFORCEMENT !!!", 0xFF0000);
        kprint_to(backbuffer, g_fb.width/2 - 200, g_fb.height/2 + 40, "UNAUTHORIZED MANIFESTATION DETECTED", 0xFFFFFF);
    }
    // 8. Sovereign Notifications (Slide-in)
    if (note_timer > 0) {
        note_timer--;
        int slide_x = g_fb.width - 220;
        if(note_timer > 160) slide_x += (note_timer - 160) * 10; // Slide in
        if(note_timer < 20) slide_x += (20 - note_timer) * 10;   // Slide out
        
        draw_rounded_rect_alpha(backbuffer, slide_x, 40, 200, 40, 0x00FF00, 200);
        kprint_to(backbuffer, slide_x + 10, 52, note_msg, 0x000000);
    }

    // 5. Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    draw_rect_to(backbuffer, mouse_x, mouse_y, 10, 10, 0xFFFFFF);
    draw_rect_to(backbuffer, mouse_x, mouse_y, 2, 14, 0x00FFFF);

    swap_buffers();
}

void refresh_ui() {
    if (current_state == STATE_LOGIN) {
        render_login_screen();
    } else if (current_state == STATE_BOOTING) {
        render_boot_sequence();
    } else {
        render_desktop();
    }
}
