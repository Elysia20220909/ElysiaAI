use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use std::thread;
use std::sync::{Arc, Mutex};
use std::net::UdpSocket;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AegisStatus {
    pub timestamp: u64,
    pub integrity_score: f32,
    pub active_guards: Vec<String>,
    pub resonance_index: f32,
    pub cpu_usage: f32,
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
            cpu_usage: 0.0,
        };

        let status = Arc::new(Mutex::new(initial_status));
        let watchdog_status = Arc::clone(&status);

        // Spawn a background monitoring thread (the Watchdog)
        thread::spawn(move || {
            let mut count = 0;
            // Initialize UDP socket for internal resonance sync
            let socket = UdpSocket::bind("127.0.0.1:0").ok();
            let target = "127.0.0.1:5005";

            loop {
                thread::sleep(Duration::from_millis(500));
                count += 1;
                
                if let Ok(mut s) = watchdog_status.lock() {
                    s.timestamp = Self::now();
                    s.cpu_usage = (count % 100) as f32 / 10.0; // Simulated CPU
                    s.resonance_index = 0.99 + (count % 10) as f32 / 1000.0;
                    
                    // Broadcast over UDP
                    if let (Some(sock), Ok(json)) = (&socket, serde_json::to_string(&*s)) {
                        let _ = sock.send_to(json.as_bytes(), target);
                    }

                    if count % 20 == 0 {
                        println!("[AEGIS] Watchdog Pulse: Integrity Stable at {:.4} (Broadcast Active)", s.resonance_index);
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


