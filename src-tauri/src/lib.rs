use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

struct KernelProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(KernelProcess(Mutex::new(None)))
    .setup(|app| {
      let app_handle = app.handle().clone();
      
      // Spawn Elysia Kernel in background
      #[cfg(debug_assertions)]
      let python_cmd = if cfg!(windows) { "python" } else { "python3" };
      
      let kernel_path = app.path().resource_dir()
        .unwrap_or_default()
        .join("usr")
        .join("lib")
        .join("elysia")
        .join("kernel.py");

      println!("[Elysia OS] Spawning Kernel: {:?}", kernel_path);

      let child = std::process::Command::new(python_cmd)
        .arg(kernel_path)
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

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
