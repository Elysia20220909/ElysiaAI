use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

mod aegis;

struct KernelProcess(Mutex<Option<Child>>);

#[tauri::command]
fn get_aegis_resonance() -> aegis::AegisStatus {
    let watchdog = aegis::AegisWatchdog::new();
    watchdog.get_status()
}

#[tauri::command]
async fn execute_signed_influence(action: String, node_name: String) -> Result<serde_json::Value, String> {
    let hmac_key = std::env::var("RESONANCE_SECRET")
        .unwrap_or_else(|_| "ELYSIAN_DEFAULT_RESONANCE_KEY".to_string());
    
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Generate Signature for the influence action
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type HmacSha256 = Hmac<Sha256>;
    
    let payload = format!("{}:{}:{}", action, node_name, timestamp);
    let mut mac = HmacSha256::new_from_slice(hmac_key.as_bytes()).map_err(|e| e.to_string())?;
    mac.update(payload.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());

    // Relay to Python server (Simulation Gateway)
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "action": action,
        "node_name": node_name,
        "signature": signature,
        "timestamp": timestamp
    });

    let res = client.post("http://localhost:8000/system/influence/execute")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_aegis_resonance, execute_signed_influence])
        .manage(KernelProcess(Mutex::new(None)))
    .on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event {
            let state = window.state::<KernelProcess>();
            let mut process_lock = state.0.lock().unwrap();
            if let Some(mut child) = process_lock.take() {
                println!("[Elysia OS] Shutting down kernel...");
                let _ = child.kill();
            }
        }
    })
    .setup(|app| {
      let _app_handle = app.handle().clone();
      
      // Determine project root for development
      #[cfg(debug_assertions)]
      let project_root = {
          let mut path = std::env::current_dir().unwrap();
          if !path.join("usr").exists() {
              // If not in root, try parent (e.g. if run from src-tauri)
              if let Some(parent) = path.parent() {
                  if parent.join("usr").exists() {
                      path = parent.to_path_buf();
                  }
              }
          }
          path
      };
      
      #[cfg(not(debug_assertions))]
      let project_root = app.path().resource_dir().unwrap_or_default();

      let kernel_path = project_root
        .join("usr")
        .join("lib")
        .join("elysia")
        .join("kernel.py");

      println!("[Elysia OS] Project Root: {:?}", project_root);
      println!("[Elysia OS] Spawning Kernel: {:?}", kernel_path);

      let python_cmd = if cfg!(windows) { "python" } else { "python3" };

      let child = std::process::Command::new(python_cmd)
        .arg(&kernel_path)
        .current_dir(&project_root)
        .spawn();

      match child {
        Ok(c) => {
          *app.state::<KernelProcess>().0.lock().unwrap() = Some(c);
          println!("[Elysia OS] Resonance Kernel Active.");
        }
        Err(e) => {
          eprintln!("[Elysia OS] ERROR: Kernel failed to resonate: {}", e);
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
