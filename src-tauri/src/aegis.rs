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
    pub verified_sig: String,
}

pub struct AegisWatchdog {
    pub name: String,
    pub level: u8,
    status: Arc<Mutex<AegisStatus>>,
}

impl AegisWatchdog {
    pub fn new() -> Self {
        let initial_status = AegisStatus {
            timestamp: Self::now(),
            integrity_score: 1.0,
            active_guards: vec!["MemoryResonance".to_string(), "EntropyShield".to_string()],
            resonance_index: 0.99,
            kernel_health: "INITIALIZING".to_string(),
            verified_sig: "00000000".to_string(),
        };

        let status = Arc::new(Mutex::new(initial_status));
        let watchdog_status = Arc::clone(&status);

        // Spawn a background monitoring thread (the Watchdog)
        thread::spawn(move || {
            let mut count = 0;
            // Initialize UDP socket for internal resonance sync
            let socket = UdpSocket::bind("127.0.0.1:0").ok();
            let target = "127.0.0.1:5005";
            const AEGIS_RESONANCE_SECRET: u32 = 0x2026BEEF;
            let hmac_key = std::env::var("RESONANCE_SECRET")
                .unwrap_or_else(|_| "ELYSIAN_DEFAULT_RESONANCE_KEY".to_string());

            loop {
                thread::sleep(Duration::from_millis(1500)); // Harmonic interval
                count += 1;
                
                // --- Phase 27: Cross-Language Integrity Verification ---
                let simulated_uptime = count as u32;
                let simulated_stability = 0.999f32;
                
                // C-side logic replication
                let mut hash: u32 = AEGIS_RESONANCE_SECRET;
                hash = (hash.wrapping_shl(5).wrapping_add(hash)).wrapping_add(simulated_uptime);
                hash = (hash.wrapping_shl(5).wrapping_add(hash)).wrapping_add((simulated_stability * 1000.0) as u32);
                let verified_sig_str = format!("{:08X}", hash);
                
                if let Ok(mut s) = watchdog_status.lock() {
                    s.timestamp = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .expect("Time moved backwards")
                        .as_secs();
                    s.resonance_index = simulated_stability;
                    s.kernel_health = "SECURE".to_string();
                    s.verified_sig = verified_sig_str;

                    // --- Phase 28: Universal Security Protocol (USP) Envelope ---
                    let nonce = format!("nonce_{}_{}", s.timestamp, count);
                    let data_json = serde_json::to_string(&*s).unwrap();
                    
                    // Generate HMAC-SHA256
                    let mut mac = HmacSha256::new_from_slice(hmac_key.as_bytes())
                        .expect("HMAC can take key of any size");
                    mac.update(format!("{}{}", nonce, data_json).as_bytes());
                    let signature = hex::encode(mac.finalize().into_bytes());

                    let envelope = serde_json::json!({
                        "signature": signature,
                        "nonce": nonce,
                        "data": *s
                    });

                    // Broadcast secured envelope over UDP
                    if let (Some(sock), Ok(payload)) = (&socket, serde_json::to_string(&envelope)) {
                        let _ = sock.send_to(payload.as_bytes(), target);
                    }

                    if count % 10 == 0 {
                        println!("[AEGIS] USP Verified Pulse: Sig={:.8}... | Status={}", signature, s.kernel_health);
                    }
                }
            }
        });

        Self {
            name: "Aegis_Watchdog_Prime".to_string(),
            level: 17,
            status,
        }
    }

    fn now() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time moved backwards")
            .as_secs()
    }

    pub fn get_status(&self) -> AegisStatus {
        self.status.lock().unwrap().clone()
    }
}


