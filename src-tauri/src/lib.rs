use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

struct KernelProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
