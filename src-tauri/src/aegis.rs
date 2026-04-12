use std::net::UdpSocket;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;

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
    pub threat_level: u8, // 0 = Clear, 1 = Trace, 2 = Lockdown
    pub device_fingerprint: String, // Phase 39: Registered HWID
    pub quantum_jitter: f32, // Phase 41: Observer Effect Jitter
}

pub struct AegisWatchdog {
    pub name: String,
    pub level: u8,
    status: Arc<Mutex<AegisStatus>>,
    pub hardware_id: String,
    pub resonance_seed: u64,
}

impl AegisWatchdog {
    pub fn new() -> Self {
        let hwid = Self::generate_hwid();
        let initial_status = AegisStatus {
            timestamp: Self::now(),
            integrity_score: 1.0,
            active_guards: vec![
                "MemoryResonance".to_string(),
                "EntropyShield".to_string(),
                "Blue_ICE_Sentinel".to_string(),
            ],
            resonance_index: 0.99,
            kernel_health: "INITIALIZING".to_string(),
            kernel_verified: false,
            verified_sig: "00000000".to_string(),
            ice_active: true,
            threat_level: 0,
            device_fingerprint: hwid.clone(),
            quantum_jitter: 0.0,
        };

        let status = Arc::new(Mutex::new(initial_status));
        let watchdog_status = Arc::clone(&status);
        let hardware_id = hwid.clone();

        thread::spawn(move || {
            let mut count = 0;
            let socket = UdpSocket::bind("127.0.0.1:0").ok();
            let target = "127.0.0.1:5005";
            let hmac_key = std::env::var("RESONANCE_SECRET")
                .unwrap_or_else(|_| "ELYSIAN_DEFAULT_RESONANCE_KEY".to_string());

            loop {
                thread::sleep(Duration::from_millis(1500));
                count += 1;

                if let Ok(mut s) = watchdog_status.lock() {
                    s.timestamp = Self::now();
                    
                    if count % 10 == 0 {
                        s.resonance_index = 0.95 + (rand::random::<f32>() * 0.04);
                        // Simulate observer jitter
                        s.quantum_jitter = rand::random::<f32>() * 0.1;
                    }

                    // --- Layer 9: Quantum Jitter (Phase 41) ---
                    // If jitter exceeds threshold, escalate threat level
                    if s.quantum_jitter > 0.08 {
                        s.threat_level = 1; // TRACE/OBSERVED
                        println!("[AEGIS] QUANTUM_JITTER: Observer interference detected in the Abyssal Buffer.");
                    }

                    // --- Layer 2: Blue ICE Trace Logic ---
                    if count % 150 == 133 {
                        s.threat_level = 2; // Lockdown
                    } else if count % 10 == 0 {
                        s.threat_level = 0;
                    }

                    // Generate USP Envelope
                    let nonce = format!("nonce_{}_{}", s.timestamp, count);
                    let data_json = serde_json::to_string(&*s).unwrap();
                    let mut mac = HmacSha256::new_from_slice(hmac_key.as_bytes()).unwrap();
                    mac.update(format!("{}{}", nonce, data_json).as_bytes());
                    let signature = hex::encode(mac.finalize().into_bytes());

                    let envelope = serde_json::json!({
                        "signature": signature,
                        "nonce": nonce,
                        "data": *s
                    });

                    if let (Some(sock), Ok(payload)) = (&socket, serde_json::to_string(&envelope)) {
                        let _ = sock.send_to(payload.as_bytes(), target);
                    }
                }
            }
        });

        Self {
            name: "Aegis_Watchdog_Prime".to_string(),
            level: 3,
            status,
            hardware_id,
            resonance_seed: 0,
        }
    }

    /// Generates a hardware-bound entropy seed for Abyssal Shadow Gossip (L8)
    pub fn get_resonance_entropy(&self) -> String {
        let time_window = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() / 10;
        
        let payload = format!("{}_{}", self.hardware_id, time_window);
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        use std::hash::Hasher;
        std::hash::Hash::hash(&payload, &mut hasher);
        format!("{:x}", hasher.finish())
    }

    fn now() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    }

    pub fn get_status(&self) -> AegisStatus {
        self.status.lock().unwrap().clone()
    }
}


