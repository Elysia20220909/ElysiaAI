use std::process::Child;
use std::sync::Mutex;
#[cfg(desktop)]
use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, State};

mod aegis;
mod aether_core;
mod blackbox_core;
mod chameleon_core;
mod confidential_core;
mod confidential_exchange;
mod error;
mod native_bridge;
mod native_lite;
mod native_resonance;
mod responsible_guard;
mod shared_resonance;
mod sovereign_physics;
mod sovereign_secrecy;

use crate::error::{AppError, AppResult};
use crate::sovereign_secrecy::{SecrecyClass, SovereignFile};

/// State holder for the background Python kernel process.
struct KernelState(Mutex<Option<Child>>);

/// Native desktop menu state for the web Voice / Emotion panel.
struct VoiceMenuState(Mutex<bool>);

/// Returns the current status of the AEGIS watchdog.
#[tauri::command]
fn get_aegis_resonance(watchdog: State<'_, aegis::AegisWatchdog>) -> aegis::AegisStatus {
    watchdog.get_status()
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
    app_handle: AppHandle,
    name: String,
    path: String,
    class: u8,
) -> AppResult<String> {
    let secrecy = match class {
        1 => SecrecyClass::Class01Genesis,
        5 => SecrecyClass::Class05Sentinel,
        9 => {
            if !sovereign_secrecy::validate_nsa_clearance()
                .await
                .map_err(AppError::Security)?
            {
                return Err(AppError::Security("NSA-Grade Clearance Denied".into()));
            }
            SecrecyClass::Class09Abyss
        }
        _ => {
            return Err(AppError::Classification(format!(
                "Invalid Secrecy Class: {}",
                class
            )))
        }
    };

    let file = SovereignFile {
        name: name.clone(),
        path,
        secrecy,
        owner: "SYSTEM_ROOT".into(),
        integrity_hash: "SHA256_PENDING".into(),
    };

    sovereign_secrecy::register_important_file(file).map_err(AppError::Internal)?;

    // Log to Immutable Ledger
    let watchdog = app_handle.state::<aegis::AegisWatchdog>();
    watchdog.log_to_ledger(
        "SECURITY",
        &format!("Class 09 Artifact Registered: {}", name),
    );

    Ok(format!("File registered with Class {:02}", class))
}

/// Returns a lightweight Rust/Swift/Bun budget snapshot for the desktop shell.
#[tauri::command]
fn native_lite_snapshot(app_handle: AppHandle) -> AppResult<native_lite::NativeLiteSnapshot> {
    let project_root = get_project_root(&app_handle)?;
    Ok(native_lite::collect_native_lite_snapshot(project_root))
}

/// Builds a local Swift/Rust native resonance report for operator planning.
#[tauri::command]
fn native_resonance_report(context: String) -> AppResult<native_resonance::NativeResonanceReport> {
    Ok(native_resonance::build_native_resonance_report(context))
}

/// Evaluates a planned AI action against responsible-AI guardrails.
#[tauri::command]
fn responsible_ai_guard_report(
    context: String,
    requested_action: String,
) -> AppResult<responsible_guard::ResponsibleGuardReport> {
    Ok(responsible_guard::build_responsible_guard_report(
        context,
        requested_action,
    ))
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
    node_name: String,
) -> AppResult<serde_json::Value> {
    let signature_data = generate_influence_signature(&action, &node_name)?;
    relay_influence_to_kernel(signature_data).await
}

/// Helper to generate HMAC-SHA256 signature for influence actions.
fn generate_influence_signature(action: &str, node_name: &str) -> AppResult<serde_json::Value> {
    use hmac::{Hmac, KeyInit, Mac};
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

/// Helper to relay signed actions to the Sovereign Node (Bun Bridge).
async fn relay_influence_to_kernel(payload: serde_json::Value) -> AppResult<serde_json::Value> {
    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:3000/api/kernel")
        .json(&serde_json::json!({
            "method": "influence",
            "params": payload
        }))
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
async fn save_secure_world_state() -> AppResult<String> {
    let state = sovereign_physics::update_simulation();
    let json = serde_json::to_vec(&state).map_err(|e| AppError::Internal(e.to_string()))?;

    // Seal with NSA-grade hardware resonance
    let sealed = crate::sovereign_secrecy::seal_class09_data(&json)?;

    let path = "secure_world_state.bin";
    std::fs::write(path, sealed).map_err(|e| AppError::Io(e))?;

    crate::sovereign_secrecy::register_important_file(crate::sovereign_secrecy::SovereignFile {
        name: "World State Backup".to_string(),
        path: path.to_string(),
        secrecy: crate::sovereign_secrecy::SecrecyClass::Class09Abyss,
        owner: "Elysia".to_string(),
        integrity_hash: hex::encode(
            reqwest::header::HeaderValue::from_str("dummy")
                .unwrap()
                .as_bytes(),
        ), // Dummy hash for now
    })
    .map_err(|e| AppError::Security(e))?;

    Ok(format!("World state sealed and stored at {}", path))
}

#[tauri::command]
fn set_basket_position_resonance(x: f32) {
    sovereign_physics::set_basket_position(x);
}

#[tauri::command]
fn set_wind_force_resonance(force: f32) {
    sovereign_physics::set_wind_force(force);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle();
                let voice_toggle = CheckMenuItemBuilder::with_id("voice-toggle", "Voice Output")
                    .checked(false)
                    .accelerator("CmdOrCtrl+Shift+V")
                    .build(handle)?;
                let voice_menu = SubmenuBuilder::new(handle, "Voice")
                    .item(&voice_toggle)
                    .build()?;
                let menu = MenuBuilder::new(handle).item(&voice_menu).build()?;
                app.set_menu(menu)?;

                app.on_menu_event(move |app_handle, event| {
                    if event.id() != "voice-toggle" {
                        return;
                    }
                    let voice_state = app_handle.state::<VoiceMenuState>();
                    let Ok(mut enabled) = voice_state.0.lock() else {
                        return;
                    };
                    *enabled = !*enabled;
                    let _ = voice_toggle.set_checked(*enabled);
                    let _ = app_handle.emit(
                        "elysia://voice-toggle",
                        serde_json::json!({ "enabled": *enabled }),
                    );
                });

                if let Err(error) = setup_kernel_process(handle) {
                    eprintln!("[Elysia OS] Sidecar kernel startup failed: {error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_aegis_resonance,
            execute_signed_influence,
            perform_native_audit,
            emergency_purge,
            register_classified_file,
            init_physics_resonance,
            drop_apple_resonance,
            update_physics_resonance,
            set_wind_force_resonance,
            set_basket_position_resonance,
            save_secure_world_state,
            native_lite_snapshot,
            native_resonance_report,
            responsible_ai_guard_report,
            get_system_specs
        ])
        .manage(aegis::AegisWatchdog::init())
        .manage(VoiceMenuState(Mutex::new(false)))
        .manage(KernelState(Mutex::new(None)))
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            let state = app_handle.state::<KernelState>();
            shutdown_kernel(state);
        }
    });
}

fn setup_kernel_process(app_handle: &AppHandle) -> AppResult<()> {
    let project_root = get_project_root(app_handle)?;

    #[cfg(debug_assertions)]
    {
        let server_path = project_root.join("python/fastapi_server.py");
        println!(
            "[Elysia OS] Spawning Kernel Server (Debug): {:?}",
            server_path
        );
        let python_cmd = if cfg!(windows) { "python" } else { "python3" };
        let child = std::process::Command::new(python_cmd)
            .arg(&server_path)
            .current_dir(&project_root)
            .spawn()
            .map_err(AppError::Io)?;

        let state = app_handle.state::<KernelState>();
        *state.0.lock().unwrap() = Some(child);
    }

    #[cfg(not(debug_assertions))]
    {
        let resource_dir = app_handle
            .path()
            .resource_dir()
            .map_err(|e| AppError::Env(e.to_string()))?;
        let target_triple = sidecar_target_triple()?;
        let ext = if cfg!(target_os = "windows") {
            ".exe"
        } else {
            ""
        };
        let sidecar_name = format!("fastapi_server-{}{}", target_triple, ext);
        let sidecar_path = resource_dir.join("bin").join(&sidecar_name);

        println!(
            "[Elysia OS] Spawning Sidecar Kernel (Release): {:?}",
            sidecar_path
        );

        let child = std::process::Command::new(&sidecar_path)
            .current_dir(&resource_dir)
            .spawn()
            .map_err(AppError::Io)?;

        let state = app_handle.state::<KernelState>();
        *state.0.lock().unwrap() = Some(child);
    }

    println!("[Elysia OS] Resonance Sidecar Kernel Active.");
    Ok(())
}

fn shutdown_kernel(state: State<'_, KernelState>) {
    let mut process_lock = state.0.lock().unwrap();
    if let Some(mut child) = process_lock.take() {
        println!("[Elysia OS] Shutting down kernel...");
        let _ = child.kill();
    }
}

fn get_project_root(_app_handle: &AppHandle) -> AppResult<std::path::PathBuf> {
    #[cfg(debug_assertions)]
    {
        let path = std::env::current_dir().map_err(AppError::Io)?;
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
        _app_handle
            .path()
            .resource_dir()
            .map_err(|e| AppError::Env(e.to_string()))
    }
}

#[cfg(not(debug_assertions))]
fn sidecar_target_triple() -> AppResult<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => Ok("x86_64-pc-windows-msvc"),
        ("macos", "x86_64") => Ok("x86_64-apple-darwin"),
        ("macos", "aarch64") => Ok("aarch64-apple-darwin"),
        ("linux", "x86_64") => Ok("x86_64-unknown-linux-gnu"),
        ("linux", "aarch64") => Ok("aarch64-unknown-linux-gnu"),
        (os, arch) => Err(AppError::Env(format!(
            "unsupported sidecar target: {os}/{arch}"
        ))),
    }
}

/// Returns dynamic hardware specs (RAM in GB, OS name, Arch) for UI auto-recommendations.
#[tauri::command]
fn get_system_specs() -> serde_json::Value {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_memory = sys.total_memory(); // bytes
    let total_gb = total_memory / 1024 / 1024 / 1024;

    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());

    serde_json::json!({
        "total_ram_gb": total_gb,
        "os_name": os_name,
        "os_version": os_version,
        "arch": std::env::consts::ARCH
    })
}
