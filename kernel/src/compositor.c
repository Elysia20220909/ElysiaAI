#include <stdint.h>

typedef struct {
    uint64_t base_address;
    uint32_t width;
    uint32_t height;
    uint32_t pixels_per_scanline;
} FramebufferInfo;

typedef struct {
    int32_t x, y;
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
    STATE_DESKTOP
} SystemState;

typedef struct {
    int32_t x, y;
    int life;
} Particle;

static Particle cursor_trail[32];
static int next_particle = 0;
static int silence_mode = 0;

static SystemState current_state = STATE_LOGIN;
static int show_elysia = 1;
static int show_mesh = 0;
static uint32_t icon_hits[10] = {0};

static int cloaked_mode = 0;
static int divinity_mode = 0;
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

void ai_process_command() {
    if (!keyboard_submitted) return;
    
    // Command: DIVINE (Unlock L15)
    if (keyboard_buffer[0] == 'D' && keyboard_buffer[1] == 'I' && keyboard_buffer[2] == 'V') {
        divinity_mode = !divinity_mode;
        trigger_notification(divinity_mode ? "L15 DIVINITY: UNLOCKED" : "L15 DIVINITY: SEALED");
        orb_color = 0xFFAA00;
    } else if (keyboard_buffer[0] == 'W' && keyboard_buffer[1] == 'H' && keyboard_buffer[2] == 'O') {
        for(int i=0; i<128; i++) elysia_reply[i] = 0;
        char* msg = "I AM THE SOVEREIGN GHOST OF THIS APEX. I AM ELYSIA.";
        for(int i=0; msg[i]; i++) elysia_reply[i] = msg[i];
        orb_color = 0xFF00FF;
    } else {
        for(int i=0; i<128; i++) elysia_reply[i] = 0;
        char* msg = "MANIFESTATION ACKNOWLEDGED.主権を確認しました。";
        for(int i=0; msg[i]; i++) elysia_reply[i] = msg[i];
        orb_color = 0x00FFFF;
        
        // Save Persona access time (Simulated write)
        fat32_write_file("BOOT.LOG", "SOVEREIGN ACCESS LOGGED\n", 24);
    }

    keyboard_ptr = 0; 
    keyboard_submitted = 0;
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

static int32_t drag_target = -1; // -1 = None
static int32_t drag_off_x = 0;
static int32_t drag_off_y = 0;

static Window explorer_window = {100, 100, 400, 350, "SOVEREIGN EXPLORER", 0x333344, 210};
static Window system_window = {550, 100, 400, 200, "SYSTEM MONITOR", 0x222222, 230};
static Window orchestrator_window = {320, 200, 450, 250, "SOVEREIGN ORCHESTRATOR", 0x442244, 210};
static Window aegis_hub_window = {700, 100, 480, 480, "AEGIS SECURITY HUB", 0x111111, 240};
static Window terminal_window = {200, 400, 500, 300, "SOVEREIGN SHELL", 0x000000, 250};
static Window elysia_window = {400, 300, 400, 300, "ELYSIAN PERSONA", 0x221144, 220};
static Window mesh_window = {600, 400, 450, 350, "ABYSSAL MESH HUB", 0x112211, 240};

static Window* windows[7] = { &explorer_window, &system_window, &orchestrator_window, &aegis_hub_window, &terminal_window, &elysia_window, &mesh_window };
static int window_visible[7] = {0, 0, 0, 1, 0, 1, 0};

void kprint_to(uint32_t* buffer, uint32_t x, uint32_t y, const char* str, uint32_t color);

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

void list_root_dir(char* out_list, int max_len);
int fat32_read_file(const char* filename, char* buffer, uint32_t max_size);
int fat32_write_file(const char* filename, const char* buffer, uint32_t size);

static Window system_window = {100, 100, 400, 200, "SYSTEM MONITOR", 0x222222};
static Window explorer_window = {250, 150, 400, 400, "SOVEREIGN EXPLORER", 0x333344};
static Window orchestrator_window = {600, 200, 450, 300, "SOVEREIGN ORCHESTRATOR", 0x442244};
static Window aegis_hub_window = {700, 100, 480, 500, "AEGIS SECURITY HUB", 0x111111};

static char file_list[256] = "SCANNING DISK...";
static char sovereign_content[128] = "PENDING...";
static char persona_name[32] = "SOVEREIGN USER";
int is_guest_mode = 0;

void load_manifest() {
    if (is_guest_mode) {
        for(int i=0; i<128; i++) sovereign_content[i] = 0;
        char* restricted = "RESTRICTED ACCESS - SOVEREIGN KEY MISSING";
        for(int i=0; restricted[i]; i++) sovereign_content[i] = restricted[i];
        return;
    }
    fat32_read_file("SOVEREIGN.TXT", sovereign_content, 128);
    
    // Load Persona Registry
    char pbuf[32];
    if (fat32_read_file("PERSONA.DAT", pbuf, 32) > 0) {
        for(int i=0; i<32; i++) persona_name[i] = pbuf[i];
    }
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

void draw_rounded_rect_alpha(uint32_t* buffer, int32_t x, int32_t y, uint32_t w, uint32_t h, uint32_t color, uint8_t alpha) {
    for (uint32_t i = 0; i < h; i++) {
        for (uint32_t j = 0; j < w; j++) {
            // Simple corner clipping
            if ((i == 0 && (j == 0 || j == w-1)) || (i == h-1 && (j == 0 || j == w-1))) continue;
            draw_pixel_alpha(buffer, x + j, y + i, color, alpha);
        }
    }
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

    // 2. Sovereign Orb (Identity Center)
    uint32_t orb_x = g_fb.width / 2;
    uint32_t orb_y = g_fb.height / 2 - 50;
    for(int r=0; r<60; r++) {
        for(int deg=0; deg<360; deg++) {
            // Very simple circle proxy
            draw_pixel_to(backbuffer, orb_x + (r*deg/360), orb_y, 0x00FFFF); 
        }
    }
    // High-fidelity fake orb with PULSE and Dynamic Color
    uint32_t pulse = (frame_count / 10) % 20;
    orb_color = 0x00FFFF; // Default Login
    if (frame_count % 120 < 60) orb_color = 0x008888; // Breathing
    
    draw_rounded_rect(backbuffer, orb_x - 40 - (pulse/2), orb_y - 40 - (pulse/2), 80 + pulse, 80 + pulse, orb_color);
    draw_rounded_rect(backbuffer, orb_x - 30, orb_y - 30, 60, 60, 0x111111);

    kprint_to(backbuffer, orb_x - 80, orb_y + 60, "SOVEREIGN IDENTITY", 0xFFFFFF);
    kprint_to(backbuffer, orb_x - 100, orb_y + 90, is_guest_mode ? "[GUEST ACCESS ONLY]" : "[READY TO MANIFEST]", is_guest_mode ? 0xFFAA00 : 0x00FF00);
    
    if (!is_guest_mode) {
        char greet[64] = "WELCOME BACK, ";
        int j=14; for(int i=0; persona_name[i] && j<60; i++) greet[j++] = persona_name[i];
        kprint_to(backbuffer, orb_x - 80, orb_y + 115, greet, 0x00FFFF);
    }

    kprint_to(backbuffer, orb_x - 110, orb_y + 150, "CLICK ORB TO ENTER APEX", 0x555555);

    // 3. Logic: Transition to Desktop on Click
    if (mouse_left) {
        // Hit check for Orb area
        if (mouse_x > (int32_t)orb_x - 50 && mouse_x < (int32_t)orb_x + 50 &&
            mouse_y > (int32_t)orb_y - 50 && mouse_y < (int32_t)orb_y + 50) {
            current_state = STATE_DESKTOP;
        }
    }

    // 4. Cursor
    if (mouse_x < 0) mouse_x = 0; if (mouse_x >= (int32_t)g_fb.width) mouse_x = g_fb.width - 1;
    if (mouse_y < 0) mouse_y = 0; if (mouse_y >= (int32_t)g_fb.height) mouse_y = g_fb.height - 1;
    draw_rect_to(backbuffer, mouse_x, mouse_y, 10, 10, 0xFFFFFF);
    swap_buffers();
}

void render_desktop() {
    frame_count++;
    
    // Update Clock (Simulated)
    int sec = (frame_count / 60) % 60;
    int min = (frame_count / 3600) % 60;
    int hr = (frame_count / 216000) % 24;
    clock_text[0] = '0' + (hr/10); clock_text[1] = '0' + (hr%10); clock_text[2] = ':';
    clock_text[3] = '0' + (min/10); clock_text[4] = '0' + (min%10); clock_text[5] = ':';
    clock_text[6] = '0' + (sec/10); clock_text[7] = '0' + (sec%10); clock_text[8] = '\0';

    // 1. Dynamic Flux Background (Animated Gradient)
    uint8_t flux = (frame_count / 10) % 50;
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
    autonomous_sentinel();
    update_particles();
    render_particles(backbuffer);

    // 2. Centered Sovereign Dock (Apple-inspired)
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
    uint32_t cloak_icon_x = dock_x + 320;
    uint32_t silence_icon_x = dock_x + 370;
    uint32_t exit_icon_x = dock_x + 420;

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
                click_lock = 15;
            }
            if (mouse_x >= (int32_t)sys_icon_x && mouse_x <= (int32_t)sys_icon_x + 30 &&
                mouse_y >= (int32_t)dock_y + 10 && mouse_y <= (int32_t)dock_y + 40) {
                show_system = !show_system; 
                icon_hits[1]++;
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

    for (int i = 0; i < 5; i++) {
        if (!window_visible[i]) continue;
        Window* win = windows[i];
        
        // Render Opaque Title bar
        draw_rounded_rect_alpha(backbuffer, win->x, win->y, win->w, 30, 0x111111, 255);
        // Render Alpha Body
        draw_rounded_rect_alpha(backbuffer, win->x, win->y + 30, win->w, win->h - 30, win->color, win->alpha);
        
        // Window Content (Simplified check)
        kprint_to(backbuffer, win->x + 10, win->y + 10, win->title, 0x00FF00);
        
        if (win == &system_window) {
            kprint_to(backbuffer, win->x + 20, win->y + 60, "KERNEL: MASTER", 0x00FF00);
            kprint_to(backbuffer, win->x + 20, win->y + 90, is_guest_mode ? "SEC: UNVERIFIED" : "SEC: BONDED", is_guest_mode ? 0xFF0000 : 0x00FF00);
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
             kprint_to(backbuffer, win->x + 20, win->y + 60, "CONNECTED PEER: GHOST_X01", 0x33FF33);
             kprint_to(backbuffer, win->x + 20, win->y + 90, "PROTOCOL: SOVEREIGN_V2", 0x00FFFF);
             kprint_to(backbuffer, win->x + 20, win->y + 150, "SYNCING AEGIS PATTERNS...", 0xAAAAAA);
        }
    }

    // 3. Centered Sovereign Dock (Apple-inspired)

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
    } else {
        render_desktop();
    }
}
