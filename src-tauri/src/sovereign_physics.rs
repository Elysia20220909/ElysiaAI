use lazy_static::lazy_static;
/**
 * ElysiaAI // Sovereign Physics Engine
 * [LIGHTWEIGHT RESONANCE SIMULATION]
 */
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

const GRAVITY: f32 = 9.81;
const TIME_STEP: f32 = 0.016; // ~60fps

#[cfg(target_os = "macos")]
extern "C" {
    fn swift_calculate_gravity_resonance(y: f32, velocity: f32) -> f32;
    fn swift_calculate_wind_resonance(x: f32, wind_force: f32) -> f32;
}

fn native_gravity_resonance(y: f32, velocity: f32) -> f32 {
    #[cfg(target_os = "macos")]
    unsafe {
        return swift_calculate_gravity_resonance(y, velocity);
    }

    #[cfg(not(target_os = "macos"))]
    {
        y + ((velocity - (GRAVITY * TIME_STEP)) * TIME_STEP)
    }
}

fn native_wind_resonance(x: f32, wind_force: f32) -> f32 {
    #[cfg(target_os = "macos")]
    unsafe {
        return swift_calculate_wind_resonance(x, wind_force);
    }

    #[cfg(not(target_os = "macos"))]
    {
        x + (wind_force * TIME_STEP)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldState {
    pub wind_force: f32,
    pub objects: Vec<PhysicalObject>,
    pub collision_events: Vec<CollisionEvent>,
    pub score: i32,
    pub lives: i32,
    pub basket_x: f32,
    pub game_over: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollisionEvent {
    pub x: f32,
    pub y: f32,
    pub intensity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicalObject {
    pub id: u32,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub velocity_x: f32,
    pub velocity_y: f32,
    pub mass: f32,
    pub restitution: f32,
    pub is_falling: bool,
    pub is_broken: bool,
}

#[tauri::command]
pub fn set_basket_position(x: f32) {
    let mut state = WORLD_STATE.lock().unwrap();
    state.basket_x = x;
}

#[tauri::command]
pub fn set_wind_force(force: f32) {
    let mut state = WORLD_STATE.lock().unwrap();
    state.wind_force = force;
}

lazy_static! {
    static ref WORLD_STATE: Mutex<WorldState> = Mutex::new(WorldState {
        wind_force: 0.0,
        objects: Vec::new(),
        collision_events: Vec::new(),
        score: 0,
        lives: 3,
        basket_x: 0.0,
        game_over: false,
    });
}

pub fn initialize_simulation() {
    let mut state = WORLD_STATE.lock().unwrap();
    state.objects.clear();
    state.collision_events.clear();
    state.score = 0;
    state.lives = 3;
    state.basket_x = 0.0;
    state.game_over = false;

    // Add multiple apples
    for i in 0..6 {
        state.objects.push(PhysicalObject {
            id: i,
            name: format!("Apple_{}", i),
            x: (i as f32 * 1.5) - 4.0,
            y: 12.0 + (i as f32 * 2.0), // Higher up for the game
            velocity_x: 0.0,
            velocity_y: 0.0,
            mass: 0.2,
            restitution: 0.4,
            is_falling: false,
            is_broken: false,
        });
    }
}

pub fn trigger_fall(id: u32) {
    let mut state = WORLD_STATE.lock().unwrap();
    if let Some(obj) = state.objects.iter_mut().find(|o| o.id == id) {
        obj.is_falling = true;
        log::info!("[PHYSICS] {} has started to fall!", obj.name);
    }
}

pub fn update_simulation() -> WorldState {
    let mut state = WORLD_STATE.lock().unwrap();
    if state.game_over {
        return state.clone();
    }

    state.collision_events.clear();
    let wind_force = state.wind_force;
    let basket_x = state.basket_x;
    let num_objs = state.objects.len();
    let mut score_delta = 0;
    let mut lives = state.lives;
    let mut should_end_game = false;
    let mut pending_events = Vec::new();

    // 1. Physics Update
    for obj in state.objects.iter_mut() {
        if obj.is_falling || obj.velocity_y.abs() > 0.1 {
            obj.y = native_gravity_resonance(obj.y, obj.velocity_y);
            obj.velocity_y -= GRAVITY * TIME_STEP;
            obj.x = native_wind_resonance(obj.x, wind_force);
            obj.velocity_x += wind_force * TIME_STEP;

            // X-Bounds enforcement (Sovereign play area)
            if obj.x < -10.0 {
                obj.x = -10.0;
                obj.velocity_x = -obj.velocity_x * 0.5;
            }
            if obj.x > 10.0 {
                obj.x = 10.0;
                obj.velocity_x = -obj.velocity_x * 0.5;
            }

            // Ground collision
            if obj.y <= 0.0 {
                obj.y = 0.0;

                // --- Game Rule: Catch Check ---
                if (obj.x - basket_x).abs() < 1.2 {
                    score_delta += 10;
                    pending_events.push(CollisionEvent {
                        x: obj.x,
                        y: 0.0,
                        intensity: 2.0,
                    });

                    obj.y = 12.0 + (rand::random::<f32>() * 5.0);
                    obj.x = (rand::random::<f32>() * 12.0) - 6.0;
                    obj.velocity_y = 0.0;
                    obj.velocity_x = 0.0;
                    obj.is_broken = false;
                    obj.is_falling = true;
                } else {
                    if obj.velocity_y.abs() > 8.0 && !obj.is_broken {
                        obj.is_broken = true;
                        lives = (lives - 1).max(0);
                        pending_events.push(CollisionEvent {
                            x: obj.x,
                            y: 0.0,
                            intensity: 1.0,
                        });

                        if lives <= 0 {
                            should_end_game = true;
                        }
                    } else if obj.velocity_y.abs() > 0.5 {
                        pending_events.push(CollisionEvent {
                            x: obj.x,
                            y: 0.0,
                            intensity: 0.3,
                        });
                    }

                    obj.velocity_y = -obj.velocity_y * obj.restitution;
                    if obj.velocity_y.abs() < 0.2 {
                        obj.velocity_y = 0.0;
                        obj.velocity_x = 0.0;
                        obj.is_falling = false;
                    }
                }
            }
        }
    }
    state.score += score_delta;
    state.lives = lives;
    if should_end_game {
        state.game_over = true;
    }
    state.collision_events.extend(pending_events);

    // 2. Inter-object Collision (Simple Sphere-Sphere)
    let radius = 0.4; // Normalized radius
    for i in 0..num_objs {
        for j in (i + 1)..num_objs {
            let collision_event = {
                let (left, right) = state.objects.split_at_mut(j);
                let obj_a = &mut left[i];
                let obj_b = &mut right[0];

                let dx = obj_b.x - obj_a.x;
                let dy = obj_b.y - obj_a.y;
                let dist_sq = dx * dx + dy * dy;
                let min_dist = radius * 2.0;

                if dist_sq < min_dist * min_dist {
                    // Collision detected!
                    let dist = dist_sq.sqrt();
                    let overlap = min_dist - dist;
                    let (nx, ny) = if dist > f32::EPSILON {
                        (dx / dist, dy / dist)
                    } else {
                        (1.0, 0.0)
                    };

                    // Separate objects
                    obj_a.x -= nx * overlap * 0.5;
                    obj_a.y -= ny * overlap * 0.5;
                    obj_b.x += nx * overlap * 0.5;
                    obj_b.y += ny * overlap * 0.5;

                    // Simple elastic collision (exchange velocities)
                    let temp_vx = obj_a.velocity_x;
                    let temp_vy = obj_a.velocity_y;
                    obj_a.velocity_x = obj_b.velocity_x * 0.8;
                    obj_a.velocity_y = obj_b.velocity_y * 0.8;
                    obj_b.velocity_x = temp_vx * 0.8;
                    obj_b.velocity_y = temp_vy * 0.8;

                    Some(CollisionEvent {
                        x: (obj_a.x + obj_b.x) / 2.0,
                        y: (obj_a.y + obj_b.y) / 2.0,
                        intensity: 0.5,
                    })
                } else {
                    None
                }
            };

            if let Some(event) = collision_event {
                state.collision_events.push(event);
            }
        }
    }

    for obj in state.objects.iter_mut() {
        obj.x = (obj.x * 1000.0).round() / 1000.0;
        obj.y = (obj.y * 1000.0).round() / 1000.0;
        obj.velocity_x = (obj.velocity_x * 1000.0).round() / 1000.0;
        obj.velocity_y = (obj.velocity_y * 1000.0).round() / 1000.0;
    }

    state.clone()
}
