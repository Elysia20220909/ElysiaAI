use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AegisStatus {
    pub timestamp: u64,
    pub integrity_score: f32,
    pub active_guards: Vec<String>,
    pub resonance_index: f32,
    pub kernel_health: String, // "SECURE", "FAILED", "TAMPERED"
    pub kernel_verified: bool,
    pub verified_sig: String,
    pub ice_active: bool,
    pub threat_level: u8,           // 0 = Clear, 1 = Trace, 2 = Lockdown
    pub device_fingerprint: String, // Phase 39: Registered HWID
    pub quantum_jitter: f32,        // Phase 41: Observer Effect Jitter
    pub sovereign_lock: bool,       // Phase 43: Absolute Sovereignty (L11)
}

pub struct AegisWatchdog {
    pub name: String,
    pub level: u8,
    pub status: Arc<Mutex<AegisStatus>>,
    pub hardware_id: String,
    pub resonance_seed: u64,
}

impl AegisWatchdog {
    pub fn init() -> Self {
        let hwid = Self::generate_hwid();
        let status = Arc::new(Mutex::new(AegisStatus {
            timestamp: Self::now(),
            integrity_score: 1.0,
            active_guards: vec![
                "MemoryResonance".to_string(),
                "EntropyShield".to_string(),
                "Blue_ICE_Sentinel".to_string(),
                "Absolute_Sovereign_L11".to_string(),
            ],
            resonance_index: 0.99,
            kernel_health: "SECURE".to_string(),
            kernel_verified: true,
            verified_sig: "AEGIS-SIG-777".to_string(),
            ice_active: true,
            threat_level: 0,
            device_fingerprint: hwid.clone(),
            quantum_jitter: 0.0,
            sovereign_lock: true,
        }));

        let watchdog_status = Arc::clone(&status);
        thread::spawn(move || {
            let mut count = 0;

            loop {
                thread::sleep(Duration::from_millis(1500));
                count += 1;
                if let Ok(mut s) = watchdog_status.lock() {
                    s.timestamp = Self::now();
                    s.resonance_index = 0.95 + (rand::random::<f32>() * 0.04);
                    s.quantum_jitter = rand::random::<f32>() * 0.1;

                    if count % 100 == 99 {
                        s.threat_level = 1;
                    } else {
                        s.threat_level = 0;
                    }
                }
            }
        });

        Self {
            name: "Aegis_Watchdog_Prime".to_string(),
            level: 11,
            status,
            hardware_id: hwid,
            resonance_seed: 0xDEADBEEF,
        }
    }

    /// Generates a hardware-bound entropy seed for Abyssal Shadow Gossip (L8)
    pub fn get_resonance_entropy(&self) -> String {
        let time_window = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            / 10;

        let payload = format!("{}_{}", self.hardware_id, time_window);
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        use std::hash::Hasher;
        std::hash::Hash::hash(&payload, &mut hasher);
        format!("{:x}", hasher.finish())
    }

    fn now() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    pub fn get_status(&self) -> AegisStatus {
        self.status
            .lock()
            .expect("Failed to lock Aegis status")
            .clone()
    }

    /// Appends a signed entry to the Sovereign Ledger.
    pub fn log_to_ledger(&self, category: &str, message: &str) {
        let timestamp = Self::now();
        let Ok(hmac_key) = std::env::var("RESONANCE_SECRET") else {
            return;
        };

        let payload = format!("{}:{}:{}", timestamp, category, message);
        let mut mac = HmacSha256::new_from_slice(hmac_key.as_bytes()).unwrap();
        mac.update(payload.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        let log_entry = format!(
            "\n- `[{}]` {} (Sig: {}...)",
            category,
            message,
            &signature[..8]
        );

        // In a real sovereign system, this would be an append-only hardware-protected file
        let ledger_path = "AEGIS_LEDGER.md";
        if let Ok(mut file) = std::fs::OpenOptions::new().append(true).open(ledger_path) {
            use std::io::Write;
            let _ = writeln!(file, "{}", log_entry);
        }
    }

    /// Generates a stable, hardware-bound identifier.
    fn generate_hwid() -> String {
        use sysinfo::{Disks, System};
        let mut s = System::new_all();
        s.refresh_all();

        let cpu_info = s.cpus().first().map(|c| c.brand()).unwrap_or("UnknownCPU");
        let total_mem = s.total_memory();
        let disks = Disks::new_with_refreshed_list();
        let disk_info: String = disks
            .iter()
            .map(|d| format!("{:?}", d.name()))
            .collect::<Vec<_>>()
            .join("|");

        let raw_id = format!("{}_{}_{}", cpu_info, total_mem, disk_info);

        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        use std::hash::Hasher;
        std::hash::Hash::hash(&raw_id, &mut hasher);
        let hash_id = format!("{:x}", hasher.finish());

        // Fallback to powershell UUID if on Windows
        #[cfg(windows)]
        {
            let output = std::process::Command::new("powershell")
                .args(&[
                    "-Command",
                    "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID",
                ])
                .output();

            if let Ok(out) = output {
                let uuid = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !uuid.is_empty() {
                    return format!("{}-{}", uuid, hash_id);
                }
            }
        }

        // Fallback for non-windows or failed powershell
        #[cfg(target_os = "macos")]
        {
            let output = std::process::Command::new("ioreg")
                .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
                .output();
            if let Ok(out) = output {
                let s = String::from_utf8_lossy(&out.stdout);
                if let Some(uuid) = s.split("IOPlatformUUID").nth(1) {
                    return format!(
                        "{}-{}",
                        uuid.trim_matches(|c| c == '"' || c == ' ' || c == '=' || c == '\n'),
                        hash_id
                    );
                }
            }
        }

        format!("ELYSIAN-RESONANCE-{}", hash_id)
    }
}
