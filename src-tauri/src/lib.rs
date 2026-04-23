use std::process::Child;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

mod aegis;
mod native_bridge;
mod confidential_core;
mod sovereign_secrecy;
mod aether_core;
mod blackbox_core;
mod chameleon_core;
mod confidential_exchange;
mod shared_resonance;
mod error;
mod sovereign_physics;

use crate::error::{AppError, AppResult};
use crate::sovereign_secrecy::{SecrecyClass, SovereignFile};

/// State holder for the background Python kernel process.
struct KernelState(Mutex<Option<Child>>);

/// Returns the current status of the AEGIS watchdog.
#[tauri::command]
fn get_aegis_resonance() -> aegis::AegisStatus {
    aegis::AegisWatchdog::new().get_status()
}

/// Triggers a native audit via the Swift-Rust bridge.
#[tauri::command]
async fn perform_native_audit(key: String) -> AppResult<(String, f64)> {
    native_bridge::trigger_native_audit(&key)
        .await
        .map_err(AppError::Security)
}

/// Registers a file with a specific secrecy classification.
/// Requires NSA-grade clearance for Class 09 Abyss.
#[tauri::command]
async fn register_classified_file(
    name: String, 
    path: String, 
    class: u8
) -> AppResult<String> {
    let secrecy = match class {
        1 => SecrecyClass::Class01Genesis,
        5 => SecrecyClass::Class05Sentinel,
        9 => {
            if !sovereign_secrecy::validate_nsa_clearance().await.map_err(AppError::Security)? {
                return Err(AppError::Security("NSA-Grade Clearance Denied".into()));
            }
            SecrecyClass::Class09Abyss
        },
        _ => return Err(AppError::Classification(format!("Invalid Secrecy Class: {}", class))),
    };

    let file = SovereignFile {
        name,
        path,
        secrecy,
        owner: "SYSTEM_ROOT".into(),
        integrity_hash: "SHA256_PENDING".into(),
    };

    sovereign_secrecy::register_important_file(file).map_err(AppError::Internal)?;
    Ok(format!("File registered with Class {:02}", class))
}

/// Initiates an emergency system-wide purge.
#[tauri::command]
fn emergency_purge() {
    let mut controller = confidential_core::ConfidentialController::new("EMERGENCY_SYSTEM_PURGE");
    controller.emergency_purge();
}

/// Executes an influence action with a cryptographic signature.
#[tauri::command]
async fn execute_signed_influence(
    action: String, 
    node_name: String
) -> AppResult<serde_json::Value> {
    let signature_data = generate_influence_signature(&action, &node_name)?;
    relay_influence_to_kernel(signature_data).await
}

/// Helper to generate HMAC-SHA256 signature for influence actions.
fn generate_influence_signature(action: &str, node_name: &str) -> AppResult<serde_json::Value> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type HmacSha256 = Hmac<Sha256>;

    let hmac_key = std::env::var("RESONANCE_SECRET")
        .unwrap_or_else(|_| "ELYSIAN_DEFAULT_RESONANCE_KEY".to_string());
    
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let payload = format!("{}:{}:{}", action, node_name, timestamp);
    let mut mac = HmacSha256::new_from_slice(hmac_key.as_bytes())
        .map_err(|e| AppError::Security(e.to_string()))?;
    mac.update(payload.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());

    Ok(serde_json::json!({
        "action": action,
        "node_name": node_name,
        "signature": signature,
        "timestamp": timestamp
    }))
}

/// Helper to relay signed actions to the background Python kernel.
async fn relay_influence_to_kernel(payload: serde_json::Value) -> AppResult<serde_json::Value> {
    let client = reqwest::Client::new();
    let res = client.post("http://localhost:8000/system/influence/execute")
        .json(&payload)
        .send()
        .await?;

    let json = res.json::<serde_json::Value>().await?;
    Ok(json)
}

#[tauri::command]
fn init_physics_resonance() {
    sovereign_physics::initialize_simulation();
}

#[tauri::command]
fn drop_apple_resonance(id: u32) {
    sovereign_physics::trigger_fall(id);
}

#[tauri::command]
fn update_physics_resonance() -> sovereign_physics::WorldState {
    sovereign_physics::update_simulation()
}

#[tauri::command]
fn set_wind_force_resonance(force: f32) {
    sovereign_physics::set_wind_force(force);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_aegis_resonance, 
            execute_signed_influence,
            perform_native_audit,
            emergency_purge,
            register_classified_file,
            init_physics_resonance,
            drop_apple_resonance,
            update_physics_resonance,
            set_wind_force_resonance
        ])
        .manage(KernelState(Mutex::new(None)))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                shutdown_kernel(window.state::<KernelState>());
            }
        })
        .setup(|app| {
            setup_kernel_process(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_kernel_process(app_handle: &AppHandle) -> AppResult<()> {
    let project_root = get_project_root(app_handle)?;
    let kernel_path = project_root.join("usr/lib/elysia/kernel.py");

    println!("[Elysia OS] Spawning Kernel: {:?}", kernel_path);

    let python_cmd = if cfg!(windows) { "python" } else { "python3" };
    let child = std::process::Command::new(python_cmd)
        .arg(&kernel_path)
        .current_dir(&project_root)
        .spawn()
        .map_err(AppError::Io)?;

    let state = app_handle.state::<KernelState>();
    *state.0.lock().unwrap() = Some(child);
    
    println!("[Elysia OS] Resonance Kernel Active.");
    Ok(())
}

fn shutdown_kernel(state: State<'_, KernelState>) {
    let mut process_lock = state.0.lock().unwrap();
    if let Some(mut child) = process_lock.take() {
        println!("[Elysia OS] Shutting down kernel...");
        let _ = child.kill();
    }
}

fn get_project_root(app_handle: &AppHandle) -> AppResult<std::path::PathBuf> {
    #[cfg(debug_assertions)]
    {
        let mut path = std::env::current_dir().map_err(AppError::Io)?;
        if !path.join("usr").exists() {
            if let Some(parent) = path.parent() {
                if parent.join("usr").exists() {
                    return Ok(parent.to_path_buf());
                }
            }
        }
        Ok(path)
    }
    
    #[cfg(not(debug_assertions))]
    {
        app_handle.path().resource_dir().map_err(|e| AppError::Env(e.to_string()))
    }
}
