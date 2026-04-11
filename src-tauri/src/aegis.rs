use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct AegisStatus {
    pub timestamp: u64,
    pub integrity_score: f32,
    pub active_guards: Vec<String>,
    pub resonance_index: f32,
}

pub struct AegisGuard {
    pub name: String,
    pub level: u8,
}

impl AegisGuard {
    pub fn new() -> Self {
        Self {
            name: "DefaultGuard".to_string(),
            level: 17,
        }
    }

    pub fn get_status(&self) -> AegisStatus {
        let start = SystemTime::now();
        let since_the_epoch = start
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        AegisStatus {
            timestamp: since_the_epoch,
            integrity_score: 0.9999,
            active_guards: vec![
                "MemoryResonance".to_string(),
                "EntropyShield".to_string(),
                "CognitiveLock".to_string(),
            ],
            resonance_index: 1.0,
        }
    }
}
